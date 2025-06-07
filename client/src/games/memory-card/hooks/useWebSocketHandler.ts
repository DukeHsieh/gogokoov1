// 卡片記憶遊戲WebSocket消息處理Hook
import { useEffect, useRef } from 'react';
import WebSocketManager from '../../../utils/WebSocketManager';
import type { GameMessage } from '../types';
import { soundEffects } from '../utils/soundEffects';

interface UseWebSocketHandlerProps {
  roomId?: string;
  playerNickname: string;
  isHost: boolean;
  onGameData?: (data: any) => void;
  onScoreUpdate?: (score: number) => void;
  onRankUpdate?: (rank: number, totalPlayers: number) => void;
  onCardFlipped?: (suit: string, value: string, positionId?: number) => void;
  onCardsFlippedBack?: (cards: { suit: string; value: string }[]) => void;
  onCardsMatched?: (cards: { suit: string; value: string }[]) => void;
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
  onCardFlipped,
  onCardsFlippedBack,
  onCardsMatched,
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
    onCardFlipped,
    onCardsFlippedBack,
    onCardsMatched,
    onGameEnded,
    onTimeUpdate,
    onPlayerListUpdate,
    onGameStarted
  });
  
  // Update callbacks ref when props change
  callbacksRef.current = {
    onGameData,
    onScoreUpdate,
    onRankUpdate,
    onCardFlipped,
    onCardsFlippedBack,
    onCardsMatched,
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
                cardsCount: message.gameData?.cards?.length,
                gameSettings: message.gameData?.gameSettings,
                fullMessage: message
              });
              
              // 確保server傳來完整的遊戲設定
              if (!message.gameData?.cards || message.gameData.cards.length === 0) {
                console.error(`[MemoryCardGame] [${new Date().toISOString()}] Incomplete game data from server:`, {
                  gameTime: message.gameData?.gameTime,
                  cardsLength: message.gameData?.cards?.length,
                  hasGameData: !!message.gameData,
                  fullMessage: message
                });
                return;
              }
              
              const gameData = {
                gameSettings: {
                  numPairs: message.gameData.cards.length / 2,
                  gameDuration: message.gameData.gameTime
                },
                cards: message.gameData.cards,
                gameTime: message.gameData.gameTime
              };
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Calling onGameData with:`, gameData);
              callbacksRef.current.onGameData?.(gameData);
              break;
              
            case 'scoreUpdate':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Score update:`, {
                score: message.score,
                playerNickname: playerNickname
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
              
            case 'cardFlipped':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Card flipped:`, {
                suit: message.suit,
                value: message.value,
                positionId: message.positionId,
                playerNickname: playerNickname,
                roomId: roomId
              });
              soundEffects.flip();
              callbacksRef.current.onCardFlipped?.(message.suit, message.value, message.positionId);
              break;
              
            case 'cardsFlipped':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Cards flipped:`, {
                cards: message.cards,
                playerNickname: playerNickname,
                roomId: roomId
              });
              soundEffects.flip();
              // Call onCardFlipped for each card
              if (message.cards) {
                message.cards.forEach((card: any) => {
                  callbacksRef.current.onCardFlipped?.(card.suit, card.value, card.positionId);
                });
              }
              break;
              
            case 'cardsFlippedBack':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Cards flipped back:`, {
                cards: message.cards,
                playerNickname: playerNickname,
                roomId: roomId,
                reason: 'Cards did not match'
              });
              soundEffects.mismatch();
              callbacksRef.current.onCardsFlippedBack?.(message.cards || []);
              break;
              
            case 'cardsMatched':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Cards matched:`, {
                cards: message.cards,
                playerNickname: playerNickname,
                roomId: roomId,
                reason: 'Cards matched successfully'
              });
              soundEffects.match();
              callbacksRef.current.onCardsMatched?.(message.cards || []);
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
              // 當收到錯誤訊息時，將相關卡片翻回去
              if (message.message === 'Card data mismatch' && message.suit && message.value) {
                callbacksRef.current.onCardsFlippedBack?.([{ suit: message.suit, value: message.value }]);
              }
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
              
            case 'timeUpdate':
              console.log(`[MemoryCardGame] [${new Date().toISOString()}] Time update:`, {
                timeLeft: message.timeLeft,
                playerNickname: playerNickname,
                roomId: roomId
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
              
            case 'gameStarted':
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
        wsManagerRef.current.removeMessageHandler('memoryCardGame');
      }
    };
  }, [roomId, playerNickname, isHost]); // Remove callback functions from dependencies to prevent reconnections

  // 發送卡片點擊消息
  const sendCardClick = (suit: string, value: string) => {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending card click:`, {
      suit: suit,
      value: value,
      playerNickname: playerNickname,
      roomId: roomId,
      isConnected: isConnectedRef.current,
      hasWSManager: !!wsManagerRef.current
    });
    
    if (wsManagerRef.current && isConnectedRef.current) {
      const message = {
        type: 'cardClick',
        data: {
          suit,
          value
        }
      };
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending WebSocket message:`, message);
      wsManagerRef.current.send(message);
    } else {
      console.error(`[MemoryCardGame] [${new Date().toISOString()}] Cannot send card click - WebSocket not connected:`, {
        hasWSManager: !!wsManagerRef.current,
        isConnected: isConnectedRef.current,
        suit: suit,
        value: value,
        playerNickname: playerNickname
      });
    }
  };

  // 發送兩張卡片點擊消息（包含positionId）
  const sendTwoCardsClick = (cards: Array<{suit: string, value: string, positionId: number}>) => {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending two cards click:`, {
      cards: cards,
      playerNickname: playerNickname,
      roomId: roomId,
      isConnected: isConnectedRef.current,
      hasWSManager: !!wsManagerRef.current
    });
    
    if (wsManagerRef.current && isConnectedRef.current) {
      const message = {
        type: 'twoCardsClick',
        data: {
          cards
        }
      };
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending WebSocket message:`, message);
      wsManagerRef.current.send(message);
    } else {
      console.error(`[MemoryCardGame] [${new Date().toISOString()}] Cannot send two cards click - WebSocket not connected:`, {
        hasWSManager: !!wsManagerRef.current,
        isConnected: isConnectedRef.current,
        cards: cards,
        playerNickname: playerNickname
      });
    }
  };

  // 發送遊戲開始消息
  const sendGameStart = () => {
    if (wsManagerRef.current && isConnectedRef.current) {
      wsManagerRef.current.send({
        type: 'startGame'
      });
    }
  };

  return {
    sendCardClick,
    sendTwoCardsClick,
    sendGameStart,
    isConnected: isConnectedRef.current
  };
};