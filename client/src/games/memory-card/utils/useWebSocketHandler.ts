// 卡片記憶遊戲WebSocket消息處理Hook
import { useEffect, useRef } from 'react';
import WebSocketManager from '../../../utils/WebSocketManager';
import type { GameMessage } from './types';
import { soundEffects } from './soundEffects';

interface UseWebSocketHandlerProps {
  roomId?: string;
  playerNickname: string;
  isHost: boolean;
  onGameData?: (data: any) => void;
  onScoreUpdate?: (score: number) => void;
  onRankUpdate?: (rank: number, totalPlayers: number) => void;
  onGameEnded?: (data: any) => void;
  onTimeUpdate?: (timeLeft: number) => void;
  onPlayerListUpdate?: (players: any[]) => void;
  onGameStarted?: (data: any) => void;
}

export const useWebSocketHandler = ({
  roomId,
  playerNickname,
  isHost,
  onGameData,
  onScoreUpdate,
  onRankUpdate,
  onGameEnded,
  onTimeUpdate,
  onPlayerListUpdate,
  onGameStarted
}: UseWebSocketHandlerProps) => {
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const isConnectedRef = useRef(false);
  
  // Store callbacks in refs to prevent stale closures
  const callbacksRef = useRef({
    onGameData,
    onScoreUpdate,
    onRankUpdate,
    onGameEnded,
    onTimeUpdate,
    onPlayerListUpdate,
    onGameStarted
  });
  
  // Update callbacks
  callbacksRef.current = {
    onGameData,
    onScoreUpdate,
    onRankUpdate,
    onGameEnded,
    onTimeUpdate,
    onPlayerListUpdate,
    onGameStarted
  };

  useEffect(() => {
    if (!roomId || !playerNickname) {
      console.error('Missing roomId or playerNickname');
      return;
    }

    const wsManager = WebSocketManager.getInstance();
    wsManagerRef.current = wsManager;
    
    // Connect or reuse existing connection
    wsManager.connect(roomId, playerNickname, isHost)
      .then(() => {
        console.log('WebSocket connection established in MemoryCardGame');
        isConnectedRef.current = true;
        
        // Add message handler for this component
        wsManager.addMessageHandler('memoryCardGame', (message: GameMessage) => {
          console.log(`[WEBSOCKET MemoryCardGame] [${new Date().toISOString()}] Message from server:`, message.type, {
            roomId: roomId,
            playerNickname: playerNickname,
            messageData: message
          });
          
          switch (message.type) {
            case 'gameData':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Processing gameData:`, {
                hasGameData: !!message.gameData,
                gameTime: message.gameData?.gameTime,
                hasGameSettings: !!message.gameData?.gameSettings,
                gameSettings: message.gameData?.gameSettings,
                fullMessage: message
              });
              
              // 確保server傳來完整的遊戲設定
              if (!message.gameData?.gameSettings) {
                console.error(`[MemoryCardGame] [${new Date().toISOString()}] Incomplete game data from server:`, {
                  gameTime: message.gameData?.gameTime,
                  hasGameSettings: !!message.gameData?.gameSettings,
                  hasGameData: !!message.gameData,
                  fullMessage: message
                });
                return;
              }
              
              const gameData = {
                gameSettings: message.gameData.gameSettings,
                gameTime: message.gameData.gameTime
              };
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Calling onGameData with:`, gameData);
              callbacksRef.current.onGameData?.(gameData);
              break;
              
            case 'gameScoreUpdate':
            case 'scoreUpdate':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Score update:`, {
                score: message.score,
                playerNickname: playerNickname,
                messageType: message.type
              });
              callbacksRef.current.onScoreUpdate?.(message.score);
              break;
              
            case 'rankUpdate':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Rank update:`, {
                rank: message.rank,
                totalPlayers: message.totalPlayers,
                playerNickname: playerNickname
              });
              callbacksRef.current.onRankUpdate?.(message.rank, message.totalPlayers);
              break;
              

              
            case 'error':
              console.error(`[MemoryCardGame] [${new Date().toISOString()}] Server error:`, {
                message: message.message,
                suit: message.suit,
                value: message.value,
                expected: message.expected,
                received: message.received,
                playerNickname: playerNickname,
                roomId: roomId
              });
              // 錯誤處理已移至客戶端
              break;
              
            case 'gameEnded':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Game ended:`, {
                reason: message.reason,
                finalResults: message.finalResults,
                playerNickname: playerNickname,
                roomId: roomId,
                fullMessage: message
              });
              soundEffects.gameOver();
              callbacksRef.current.onGameEnded?.(message);
              break;
              
            case 'gameTimeUpdate':
            case 'timeUpdate':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Time update:`, {
                timeLeft: message.timeLeft,
                playerNickname: playerNickname,
                messageType: message.type
              });
              
              callbacksRef.current.onTimeUpdate?.(message.timeLeft);
              break;
              
            case 'playerListUpdate':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Player list update:`, {
                playersCount: message.players?.length,
                players: message.players,
                roomId: roomId
              });
              callbacksRef.current.onPlayerListUpdate?.(message.players);
              break;
              
            case 'gameGameStarted':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Game started:`, {
                playerNickname: playerNickname,
                roomId: roomId,
                hasGameData: !!message.gameData,
                fullMessage: message
              });
              
              // 如果gameStarted消息包含gameData，處理遊戲數據
              if (message.gameData) {
                console.log(`[MemoryCardGame] [${new Date().toISOString()}] Processing gameData from gameStarted:`, {
                  hasGameData: !!message.gameData,
                  gameTime: message.gameData?.gameTime,
                  cardsCount: message.gameData?.cards?.length,
                  gameSettings: message.gameData?.gameSettings,
                  fullGameData: message.gameData
                });
                
                // 確保server傳來完整的遊戲設定
                if (!message.gameData?.cards || message.gameData.cards.length === 0) {
                  console.error(`[MemoryCardGame] [${new Date().toISOString()}] Incomplete game data from gameStarted:`, {
                    gameTime: message.gameData?.gameTime,
                    cardsLength: message.gameData?.cards?.length,
                    hasGameData: !!message.gameData,
                    fullMessage: message
                  });
                } else {
                  // 使用默認遊戲時間（5分鐘 = 300秒）如果服務器沒有提供
                  const defaultGameTime = 300; // 5 minutes in seconds
                  const actualGameTime = message.gameData.gameTime || defaultGameTime;
                  
                  const gameData = {
                    gameSettings: {
                      numPairs: message.gameData.cards.length / 2,
                      gameDuration: actualGameTime
                    },
                    cards: message.gameData.cards,
                    gameTime: actualGameTime
                  };
                  console.log(`[MemoryCardGame] [${new Date().toISOString()}] Calling onGameData from gameStarted with:`, {
                    gameData: gameData,
                    originalGameTime: message.gameData.gameTime,
                    usedDefaultTime: !message.gameData.gameTime
                  });
                  callbacksRef.current.onGameData?.(gameData);
                }
              }
              
              callbacksRef.current.onGameStarted?.(message);
              break;
              
            case 'playerJoined':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Player joined:`, {
                player: message.data?.player,
                totalPlayers: message.data?.totalPlayers,
                roomId: roomId
              });
              // playerJoined消息通常由platform處理，這裡只記錄
              break;
              
            case 'gameState':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Game state received:`, {
                hasGameData: !!message.gameData,
                gameTime: message.gameTime,
                playersCount: message.players?.length,
                roomId: roomId
              });
              
              // 處理gameState消息，類似於gameData
              if (message.gameData) {
                const gameData = {
                  gameSettings: message.gameData.gameSettings || {
                    numPairs: message.gameData.cards?.length / 2 || 8,
                    gameDuration: message.gameTime || 300
                  },
                  cards: message.gameData.cards || [],
                  gameTime: message.gameTime || 300
                };
                console.log(`[MemoryCardGame] [${new Date().toISOString()}] Processing gameState data:`, gameData);
                callbacksRef.current.onGameData?.(gameData);
              }
              
              // 處理玩家列表更新
              if (message.players) {
                callbacksRef.current.onPlayerListUpdate?.(message.players);
              }
              break;
              
            default:
              console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Unhandled message type:`, {
                type: message.type,
                playerNickname: playerNickname,
                roomId: roomId,
                fullMessage: message
              });
          }
        });
      })
      .catch(error => {
        console.error('Failed to connect WebSocket:', error);
        isConnectedRef.current = false;
      });

    // Cleanup function
    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.removeMessageHandler('memoryCardGame', 'game');
      }
    };
  }, [roomId, playerNickname, isHost]); // Remove callback functions from dependencies to prevent reconnections

  // 發送分數更新消息
  const sendScoreUpdate = (score: number) => {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending score update:`, {
      score: score,
      playerNickname: playerNickname,
      roomId: roomId,
      isConnected: isConnectedRef.current,
      hasWSManager: !!wsManagerRef.current
    });
    
    if (wsManagerRef.current && isConnectedRef.current) {
      const message = {
        type: 'scoreUpdate',
        data: {
          score
        }
      };
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending WebSocket message:`, message);
      wsManagerRef.current.send(message);
    } else {
      console.error(`[MemoryCardGame] [${new Date().toISOString()}] Cannot send score update - WebSocket not connected:`, {
        hasWSManager: !!wsManagerRef.current,
        isConnected: isConnectedRef.current,
        score: score,
        playerNickname: playerNickname
      });
    }
  };

  return {
    sendScoreUpdate,
    isConnected: isConnectedRef.current
  };
};