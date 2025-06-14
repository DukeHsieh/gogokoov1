// Red Envelope Game WebSocket Handler
import { useEffect, useRef } from 'react';
import WebSocketManager from '../../../../utils/WebSocketManager';
import type { GameData, RedEnvelopeItem, GameSettings } from '../types';
import { soundEffects } from '../soundEffects';

export interface GameMessage {
  type: string;
  gameData?: GameData;
  score?: number;
  rank?: number;
  totalPlayers?: number;
  timeLeft?: number;
  gameTime?: number;
  players?: any[];
  reason?: string;
  finalResults?: any;
  message?: string;
  envelope?: RedEnvelopeItem;
  envelopes?: RedEnvelopeItem[];
  data?: any;
}

interface UseWebSocketHandlerProps {
  roomId?: string;
  playerNickname: string;
  isHost: boolean;
  onGameData?: (data: GameData) => void;
  onScoreUpdate?: (score: number) => void;
  onRankUpdate?: (rank: number, totalPlayers: number) => void;
  onGameEnded?: (data: any) => void;
  onTimeUpdate?: (timeLeft: number) => void;
  onPlayerListUpdate?: (players: any[]) => void;
  onGameStarted?: (data: any) => void;
  onEnvelopeCollected?: (envelope: RedEnvelopeItem) => void;
  onEnvelopeSpawned?: (envelope: RedEnvelopeItem) => void;
  onEnvelopesUpdate?: (envelopes: RedEnvelopeItem[]) => void;
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
  onGameStarted,
  onEnvelopeCollected,
  onEnvelopeSpawned,
  onEnvelopesUpdate
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
    onGameStarted,
    onEnvelopeCollected,
    onEnvelopeSpawned,
    onEnvelopesUpdate
  });
  
  // Update callbacks
  callbacksRef.current = {
    onGameData,
    onScoreUpdate,
    onRankUpdate,
    onGameEnded,
    onTimeUpdate,
    onPlayerListUpdate,
    onGameStarted,
    onEnvelopeCollected,
    onEnvelopeSpawned,
    onEnvelopesUpdate
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
        console.log('WebSocket connection established in RedEnvelopeGame');
        isConnectedRef.current = true;
        
        // Add message handler for this component
        wsManager.addMessageHandler('redEnvelopeGame', (message: GameMessage) => {
          console.log(`[WEBSOCKET RedEnvelopeGame] [${new Date().toISOString()}] Message from server:`, message.type, {
            roomId: roomId,
            playerNickname: playerNickname,
            messageData: message
          });
          
          switch (message.type) {
            case 'gameData':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Processing gameData:`, {
                hasGameData: !!message.gameData,
                gameTime: message.gameData?.gameTime,
                hasGameSettings: !!message.gameData?.gameSettings,
                gameSettings: message.gameData?.gameSettings,
                envelopesCount: message.gameData?.envelopes?.length,
                fullMessage: message
              });
              
              // 確保server傳來完整的遊戲設定
              if (!message.gameData?.gameSettings) {
                console.error(`[RedEnvelopeGame] [${new Date().toISOString()}] Incomplete game data from server:`, {
                  gameTime: message.gameData?.gameTime,
                  hasGameSettings: !!message.gameData?.gameSettings,
                  hasGameData: !!message.gameData,
                  fullMessage: message
                });
                return;
              }
              
              const gameData: GameData = {
                gameSettings: message.gameData.gameSettings,
                gameTime: message.gameData.gameTime,
                envelopes: message.gameData.envelopes || []
              };
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Calling onGameData with:`, {
                hasGameSettings: !!gameData.gameSettings,
                gameTime: gameData.gameTime,
                envelopesLength: gameData.envelopes.length,
                gameData: gameData
              });
              callbacksRef.current.onGameData?.(gameData);
              break;
              
            case 'gameScoreUpdate':
            case 'scoreUpdate':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Score update:`, {
                score: message.score,
                playerNickname: playerNickname,
                messageType: message.type
              });
              if (message.score !== undefined) {
                callbacksRef.current.onScoreUpdate?.(message.score);
              }
              break;
              
            case 'rankUpdate':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Rank update:`, {
                rank: message.rank,
                totalPlayers: message.totalPlayers,
                playerNickname: playerNickname
              });
              if (message.rank !== undefined && message.totalPlayers !== undefined) {
                callbacksRef.current.onRankUpdate?.(message.rank, message.totalPlayers);
              }
              break;
              
            case 'envelopeCollected':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Envelope collected:`, {
                envelope: message.envelope,
                playerNickname: playerNickname
              });
              if (message.envelope) {
                soundEffects.collect();
                callbacksRef.current.onEnvelopeCollected?.(message.envelope);
              }
              break;
              
            case 'envelopeSpawned':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Envelope spawned:`, {
                envelope: message.envelope,
                playerNickname: playerNickname
              });
              if (message.envelope) {
                callbacksRef.current.onEnvelopeSpawned?.(message.envelope);
              }
              break;
              
            case 'envelopesUpdate':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Envelopes update:`, {
                envelopesCount: message.envelopes?.length,
                playerNickname: playerNickname
              });
              if (message.envelopes) {
                callbacksRef.current.onEnvelopesUpdate?.(message.envelopes);
              }
              break;
              
            case 'error':
              console.error(`[RedEnvelopeGame] [${new Date().toISOString()}] Server error:`, {
                message: message.message,
                playerNickname: playerNickname,
                roomId: roomId
              });
              break;
              
            case 'gameEnded':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Game ended:`, {
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
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Time update:`, {
                timeLeft: message.timeLeft,
                playerNickname: playerNickname,
                messageType: message.type
              });
              
              if (message.timeLeft !== undefined) {
                callbacksRef.current.onTimeUpdate?.(message.timeLeft);
              }
              break;
              
            case 'playerListUpdate':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Player list update:`, {
                playersCount: message.players?.length,
                players: message.players,
                roomId: roomId
              });
              if (message.players) {
                callbacksRef.current.onPlayerListUpdate?.(message.players);
              }
              break;
              
            case 'gameGameStarted':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Game started:`, {
                playerNickname: playerNickname,
                roomId: roomId,
                hasGameData: !!message.gameData,
                fullMessage: message
              });
              
              // 如果gameStarted消息包含gameData，處理遊戲數據
              if (message.gameData) {
                console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Processing gameData from gameStarted:`, {
                  hasGameData: !!message.gameData,
                  gameTime: message.gameData?.gameTime,
                  envelopesCount: message.gameData?.envelopes?.length,
                  gameSettings: message.gameData?.gameSettings,
                  fullGameData: message.gameData
                });
                
                // 確保server傳來完整的遊戲設定
                if (!message.gameData?.envelopes || message.gameData.envelopes.length === 0) {
                  console.error(`[RedEnvelopeGame] [${new Date().toISOString()}] Incomplete game data from gameStarted:`, {
                    gameTime: message.gameData?.gameTime,
                    envelopesLength: message.gameData?.envelopes?.length,
                    hasGameData: !!message.gameData,
                    fullMessage: message
                  });
                } else {
                  // 使用默認遊戲時間（5分鐘 = 300秒）如果服務器沒有提供
                  const defaultGameTime = 300; // 5 minutes in seconds
                  const actualGameTime = message.gameData.gameTime || defaultGameTime;
                  
                  const gameData: GameData = {
                    gameSettings: {
                      duration: actualGameTime / 60, // 轉換為分鐘
                      gameTime: actualGameTime,
                      envelopeCount: message.gameData.envelopes.length,
                      dropSpeed: 1,
                      title: 'Red Envelope Game',
                      description: 'Collect falling red envelopes to earn points!'
                    },
                    envelopes: message.gameData.envelopes,
                    gameTime: actualGameTime
                  };
                  console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Calling onGameData from gameStarted with:`, {
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
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Player joined:`, {
                player: message.data?.player,
                totalPlayers: message.data?.totalPlayers,
                roomId: roomId
              });
              // playerJoined消息通常由platform處理，這裡只記錄
              break;
              
            case 'gameState':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Game state received:`, {
                hasGameData: !!message.gameData,
                gameTime: message.gameTime,
                playersCount: message.players?.length,
                roomId: roomId
              });
              
              // 處理gameState消息，類似於gameData
              if (message.gameData) {
                const gameData: GameData = {
                  gameSettings: message.gameData.gameSettings || {
                    duration: (message.gameTime || 300) / 60,
                    gameTime: message.gameTime || 300,
                    envelopeCount: message.gameData.envelopes?.length || 50,
                    dropSpeed: 1,
                    title: 'Red Envelope Game',
                    description: 'Collect falling red envelopes to earn points!'
                  },
                  envelopes: message.gameData.envelopes || [],
                  gameTime: message.gameTime || 300
                };
                console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Processing gameState data:`, gameData);
                callbacksRef.current.onGameData?.(gameData);
              }
              
              // 處理玩家列表更新
              if (message.players) {
                callbacksRef.current.onPlayerListUpdate?.(message.players);
              }
              break;
              
            case 'gameTimer':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Game timer update:`, {
                timeLeft: message.data?.timeLeft,
                status: message.data?.status,
                playerNickname: playerNickname,
                roomId: roomId
              });
              
              if (message.data?.timeLeft !== undefined) {
                callbacksRef.current.onTimeUpdate?.(message.data.timeLeft);
              }
              
              // 如果遊戲狀態改變，也通知相關回調
              if (message.data?.status) {
                if (message.data.status === 'ended') {
                  callbacksRef.current.onGameEnded?.(message);
                }
              }
              break;
              
            case 'newEnvelope':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] New envelope spawned:`, {
                envelope: message.data?.envelope,
                playerNickname: playerNickname,
                roomId: roomId
              });
              
              if (message.data?.envelope) {
                callbacksRef.current.onEnvelopeSpawned?.(message.data.envelope);
              }
              break;
              
            case 'gameEnd':
              console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Game end received:`, {
                finalResults: message.data?.finalResults,
                reason: message.data?.reason,
                playerNickname: playerNickname,
                roomId: roomId,
                fullMessage: message
              });
              
              soundEffects.gameOver();
              callbacksRef.current.onGameEnded?.(message);
              break;
              
            default:
              console.warn(`[RedEnvelopeGame] [${new Date().toISOString()}] Unhandled message type:`, {
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
        wsManagerRef.current.removeMessageHandler('redEnvelopeGame', 'game');
      }
    };
  }, [roomId, playerNickname, isHost]); // Remove callback functions from dependencies to prevent reconnections

  // 發送分數更新消息
  const sendScoreUpdate = (score: number) => {
    console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Sending score update:`, {
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
      console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Sending WebSocket message:`, message);
      wsManagerRef.current.send(message);
    } else {
      console.error(`[RedEnvelopeGame] [${new Date().toISOString()}] Cannot send score update - WebSocket not connected:`, {
        hasWSManager: !!wsManagerRef.current,
        isConnected: isConnectedRef.current,
        score: score,
        playerNickname: playerNickname
      });
    }
  };

  // 發送紅包收集消息
  const sendEnvelopeCollected = (envelopeId: string, value: number) => {
    console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Sending envelope collected:`, {
      envelopeId: envelopeId,
      value: value,
      playerNickname: playerNickname,
      roomId: roomId,
      isConnected: isConnectedRef.current,
      hasWSManager: !!wsManagerRef.current
    });
    
    if (wsManagerRef.current && isConnectedRef.current) {
      const message = {
        type: 'envelopeCollected',
        data: {
          envelopeId,
          value
        }
      };
      console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Sending WebSocket message:`, message);
      wsManagerRef.current.send(message);
    } else {
      console.error(`[RedEnvelopeGame] [${new Date().toISOString()}] Cannot send envelope collected - WebSocket not connected:`, {
        hasWSManager: !!wsManagerRef.current,
        isConnected: isConnectedRef.current,
        envelopeId: envelopeId,
        value: value,
        playerNickname: playerNickname
      });
    }
  };

  // 發送遊戲結束消息
  const sendGameEnded = (finalScore: number) => {
    console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Sending game ended:`, {
      finalScore: finalScore,
      playerNickname: playerNickname,
      roomId: roomId,
      isConnected: isConnectedRef.current,
      hasWSManager: !!wsManagerRef.current
    });
    
    if (wsManagerRef.current && isConnectedRef.current) {
      const message = {
        type: 'gameEnded',
        data: {
          finalScore
        }
      };
      console.log(`[RedEnvelopeGame] [${new Date().toISOString()}] Sending WebSocket message:`, message);
      wsManagerRef.current.send(message);
    } else {
      console.error(`[RedEnvelopeGame] [${new Date().toISOString()}] Cannot send game ended - WebSocket not connected:`, {
        hasWSManager: !!wsManagerRef.current,
        isConnected: isConnectedRef.current,
        finalScore: finalScore,
        playerNickname: playerNickname
      });
    }
  };

  return {
    sendScoreUpdate,
    sendEnvelopeCollected,
    sendGameEnded,
    isConnected: isConnectedRef.current
  };
};