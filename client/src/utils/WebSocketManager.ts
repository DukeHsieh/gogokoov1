import API_CONFIG from '../config/api';

export interface GameMessage {
  type: string;
  data?: any;
  timestamp?: number;
  messageId?: string;
}

export interface GameState {
  isActive: boolean;
  gameType?: string;
  roomId?: string;
}

export type HandlerType = 'platform' | 'game';

interface WebSocketGameState {
  isGameActive: boolean;
  gameType: string | null;
  roomId: string | null;
  playerNickname: string | null;
  isHost: boolean;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private gameState: WebSocketGameState = {
    isGameActive: false,
    gameType: null,
    roomId: null,
    playerNickname: null,
    isHost: false
  };
  private platformHandlers: Map<string, (message: any) => void> = new Map();
  private gameHandlers: Map<string, (message: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private processedMessages: Set<string> = new Set();
  private lastMessageTime: number = 0;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(roomId: string, nickname: string, isHost: boolean): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      // 如果已經有連接且房間和玩家相同，直接返回現有連接
      // 注意：isHost參數可能在platform和game之間變化，但實際上是同一個連接
      if (this.ws && 
          this.ws.readyState === WebSocket.OPEN && 
          this.gameState.roomId === roomId && 
          this.gameState.playerNickname === nickname) {
        console.log('[WebSocketManager] Reusing existing connection', {
          currentIsHost: this.gameState.isHost,
          newIsHost: isHost,
          roomId: roomId,
          nickname: nickname
        });
        // 更新isHost狀態但保持連接
        this.gameState.isHost = isHost;
        resolve(this.ws);
        return;
      }

      // 如果遊戲正在進行中且嘗試連接到不同房間，拒絕連接
      if (this.gameState.isGameActive && this.gameState.roomId !== roomId) {
        console.warn('[WebSocketManager] Cannot connect to different room while game is active');
        reject(new Error('Game is active in different room'));
        return;
      }

      // 關閉現有連接（如果存在且不是關閉狀態）
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        this.ws.close();
      }

      this.gameState.roomId = roomId;
      this.gameState.playerNickname = nickname;
      this.gameState.isHost = isHost;

      const wsUrl = API_CONFIG.WS_URL(roomId, nickname, isHost);
      console.log('[WebSocketManager] Connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      let hasOpened = false; // Flag to track if the connection has successfully opened

      this.ws.onopen = () => {
        console.log('[WebSocketManager] Connected to WebSocket');
        this.reconnectAttempts = 0;
        hasOpened = true;
        
        // 發送加入消息
        this.send({
          type: 'join',
          payload: {
            roomId: roomId,
            nickname: nickname,
            isHost: isHost
          }
        });
        
        resolve(this.ws!);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Create message hash for deduplication
          const messageHash = this.createMessageHash(message);
          const currentTime = Date.now();
          
          // Skip if same message was processed within last 25ms
          if (this.processedMessages.has(messageHash) && 
              (currentTime - this.lastMessageTime) < 25) {
            console.log('[WebSocketManager] Skipping duplicate message:', message.type);
            return;
          }
          
          // Clean old processed messages (keep only last 100)
          if (this.processedMessages.size > 100) {
            const oldMessages = Array.from(this.processedMessages).slice(0, 50);
            oldMessages.forEach(hash => this.processedMessages.delete(hash));
          }
          
          this.processedMessages.add(messageHash);
          this.lastMessageTime = currentTime;
          
          // console.log('[WebSocketManager] Processing message:', message);
          
          // 處理遊戲狀態變化
          if (message.type === 'platformGameStarted') {
            const gameType = message.data?.gameType || message.gameType;
            this.gameState.isGameActive = true;
            this.gameState.gameType = gameType;
            console.log('[WebSocketManager] Game started - connection locked', {
              gameType: gameType,
              roomId: this.gameState.roomId
            });
          } else if (message.type === 'gameEnded') {
          this.gameState.isGameActive = false;
          this.gameState.gameType = null;
          console.log('[WebSocketManager] Game ended - connection unlocked (but keeping connection open)');
          }
          
          // Route messages to appropriate handlers based on type prefix
          // console.log('[WebSocketManager] Routing message type:', message.type);
          if (message.type.startsWith('platform')) {
            this.platformHandlers.forEach((handler) => {
              try {
                // console.log('[WebSocketManager] Sending to platform handler:', message.type);
                handler(message);
              } catch (error) {
                console.error('Error in platform handler:', error);
              }
            });
          } else if (message.type.startsWith('game')) {
            this.gameHandlers.forEach((handler) => {
              try {
                // console.log('[WebSocketManager] Sending to game handler:', message.type);
                handler(message);
              } catch (error) {
                console.error('Error in game handler:', error);
              }
            });
          } else {
            // For backward compatibility, send to both handlers
            [...this.platformHandlers.values(), ...this.gameHandlers.values()].forEach((handler) => {
              try {
                // console.log('[WebSocketManager] Sending to both handlers:', message.type);
                handler(message);
              } catch (error) {
                console.error('Error in message handler:', error);
              }
            });
          }
        } catch (error) {
          console.error('[WebSocketManager] Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocketManager] WebSocket disconnected:', event.code, event.reason);
        if (!hasOpened) {
          // If connection closed before opening, reject the promise
          reject(new Error(`WebSocket closed before connection established: Code ${event.code}, Reason: ${event.reason}`));
          return;
        }
        // 只有在非正常關閉（例如網路問題）時才嘗試重連
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`[WebSocketManager] Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(roomId, nickname, isHost).catch(console.error);
          }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        } else if (event.code === 1000) {
          console.log('[WebSocketManager] WebSocket closed normally.');
        } else {
          console.error('[WebSocketManager] Max reconnect attempts reached or abnormal closure. Not attempting to reconnect.');
        }
      };

      this.ws.onerror = (event: Event) => {
        console.error('[WebSocketManager] WebSocket error:', event);
        const errorMessage = (event instanceof ErrorEvent) ? event.message : 'Unknown error';
        if (!hasOpened) {
          // If an error occurs before opening, reject the promise
          reject(new Error(`WebSocket error before connection established: ${errorMessage}`));
        }

        reject(new Error(errorMessage));
      };
    });
  }

  public send(message: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('[WebSocketManager] Cannot send message - WebSocket not connected');
    return false;
  }

  public addMessageHandler(key: string, handler: (message: any) => void, type: HandlerType = 'game'): void {
    if (type === 'platform') {
      this.platformHandlers.set(key, handler);
    } else {
      this.gameHandlers.set(key, handler);
    }
  }

  public removeMessageHandler(key: string, type?: HandlerType): void {
    if (type === 'platform') {
      this.platformHandlers.delete(key);
    } else if (type === 'game') {
      this.gameHandlers.delete(key);
    } else {
      // Remove from both if type not specified
      this.platformHandlers.delete(key);
      this.gameHandlers.delete(key);
    }
  }

  public removeAllGameHandlers(): void {
    this.gameHandlers.clear();
  }

  public disconnect(): void {
    // Allow disconnection but don't automatically close on game end
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.gameState = {
      isGameActive: false,
      gameType: null,
      roomId: null,
      playerNickname: null,
      isHost: false
    };
    this.platformHandlers.clear();
    this.gameHandlers.clear();
    console.log('[WebSocketManager] Disconnected');
  }

  public disconnectIfGameInactive(): void {
    // Only disconnect if game is not active (legacy behavior)
    if (!this.gameState.isGameActive) {
      this.disconnect();
    } else {
      console.warn('[WebSocketManager] Cannot disconnect while game is active');
    }
  }

  public forceDisconnect(): void {
    // 強制斷開連接（遊戲結束時使用）
    if (this.ws) {
      this.ws.close(1000, 'Game ended');
      this.ws = null;
    }
    this.gameState = {
      isGameActive: false,
      gameType: null,
      roomId: null,
      playerNickname: null,
      isHost: false
    };
    this.platformHandlers.clear();
    this.gameHandlers.clear();
    console.log('[WebSocketManager] Force disconnected');
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getConnection(): WebSocket | null {
    return this.ws && this.ws.readyState === WebSocket.OPEN ? this.ws : null;
  }

  public isGameActive(): boolean {
    return this.gameState.isGameActive;
  }

  public getGameState(): WebSocketGameState {
    return { ...this.gameState };
  }

  public setGameActive(active: boolean): void {
    this.gameState.isGameActive = active;
    console.log(`[WebSocketManager] Game active state set to: ${active}`);
  }

  private createMessageHash(message: any): string {
    // Create a more specific hash that includes actual content changes
    const hashData = {
      type: message.type,
      timestamp: Math.floor(Date.now() / 50), // Shorter window for deduplication
      // Include actual data content for playerListUpdate messages
      playersData: message.type === 'playerListUpdate' ? 
        (message.data && Array.isArray(message.data) ? message.data.map((p: any) => p.nickname).sort().join(',') : '') : '',
      playersCount: message.data && Array.isArray(message.data) ? message.data.length : 0,
      gameStarted: message.gameStarted,
      gameEnded: message.gameEnded,
      waitingForPlayers: message.waitingForPlayers
    };
    return JSON.stringify(hashData);
  }
}

export default WebSocketManager;