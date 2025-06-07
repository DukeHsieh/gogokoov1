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
  onCardFlipped?: (cardId: number) => void;
  onCardsFlippedBack?: (cardIds: number[]) => void;
  onCardsMatched?: (cardIds: number[]) => void;
  onGameEnded?: (data: any) => void;
  onTimeUpdate?: (timeLeft: number) => void;
  onPlayerListUpdate?: (players: any[]) => void;
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
  onPlayerListUpdate
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
    onPlayerListUpdate
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
    onPlayerListUpdate
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
          console.log('[WEBSOCKET MemoryCardGame] Message from server: ', message);
          
          switch (message.type) {
            case 'gameData':
              console.log('Received game data on MemoryCardGame:', message);
              
              // 確保server傳來完整的遊戲設定
              if (!message.gameTime || !message.cards) {
                console.error('[MemoryCardGame] Incomplete game data from server:', message);
                return;
              }
              
              const gameData = {
                gameSettings: {
                  numPairs: message.cards.length / 2,
                  gameDuration: message.gameTime
                },
                cards: message.cards,
                gameTime: message.gameTime
              };
              callbacksRef.current.onGameData?.(gameData);
              break;
              
            case 'scoreUpdate':
              callbacksRef.current.onScoreUpdate?.(message.score);
              break;
              
            case 'rankUpdate':
              callbacksRef.current.onRankUpdate?.(message.rank, message.totalPlayers);
              break;
              
            case 'cardFlipped':
              console.log('Card flipped:', message.cardId);
              soundEffects.flip();
              callbacksRef.current.onCardFlipped?.(message.cardId);
              break;
              
            case 'cardsFlippedBack':
              console.log('Cards flipped back:', message.cardIds);
              soundEffects.mismatch();
              callbacksRef.current.onCardsFlippedBack?.(message.cardIds);
              break;
              
            case 'cardsMatched':
              console.log('Cards matched:', message.cardIds);
              soundEffects.match();
              callbacksRef.current.onCardsMatched?.(message.cardIds);
              break;
              
            case 'gameEnded':
              console.log('Game ended:', message);
              soundEffects.gameOver();
              callbacksRef.current.onGameEnded?.(message);
              break;
              
            case 'timeUpdate':
              callbacksRef.current.onTimeUpdate?.(message.timeLeft);
              break;
              
            case 'playerListUpdate':
              callbacksRef.current.onPlayerListUpdate?.(message.players);
              break;
              
            default:
              console.log('Unhandled message type:', message.type);
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
  const sendCardClick = (cardId: number) => {
    if (wsManagerRef.current && isConnectedRef.current) {
      wsManagerRef.current.send({
        type: 'cardClick',
        cardId
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
    sendGameStart,
    isConnected: isConnectedRef.current
  };
};