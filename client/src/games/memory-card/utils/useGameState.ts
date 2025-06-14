// 卡片記憶遊戲狀態管理Hook
import { useState, useCallback, useEffect } from 'react';
import type { GameState, GameData, GameSettings } from './types';
import { generateCards } from '../player/cardGenerator';

interface UseGameStateProps {
  roomId?: string;
  gameSettings?: GameSettings;
  initialTimeLeft?: number;
}

export const useGameState = ({ roomId, gameSettings, initialTimeLeft }: UseGameStateProps = {}) => {
  // 從 localStorage 讀取遊戲設定
  const [storedGameSettings, setStoredGameSettings] = useState<GameSettings | null>(null);
  
  useEffect(() => {
    if (roomId) {
      const storedSettings = localStorage.getItem(`game_${roomId}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setStoredGameSettings(settings);
        console.log('[useGameState] Loaded game settings from localStorage:', settings);
      }
    }
  }, [roomId]);

  // 計算實際的遊戲時間
  const getActualGameDuration = useCallback(() => {
    if (storedGameSettings) {
      return storedGameSettings.duration * 60; // 分鐘轉秒
    }
    return initialTimeLeft || gameSettings?.duration || 60;
  }, [storedGameSettings, initialTimeLeft, gameSettings?.duration]);

  const [gameState, setGameState] = useState<GameState>({
    status: 'playing', // 直接開始遊戲，不等待
    timeLeft: initialTimeLeft || 60,
    cards: [],
    score: 0,
    rank: 0,
    totalPlayers: 0,
  });

  // 當 storedGameSettings 更新時，更新遊戲時間
  useEffect(() => {
    if (storedGameSettings) {
      const actualGameDuration = storedGameSettings.duration * 60;
      setGameState(prev => ({
        ...prev,
        timeLeft: actualGameDuration
      }));
      console.log('[useGameState] Updated game time with stored settings:', actualGameDuration);
    }
  }, [storedGameSettings]);

  // 初始化遊戲數據
  const initializeGame = useCallback((gameData: GameData) => {
    console.log(`[useGameState] [${new Date().toISOString()}] Initializing game with data:`, {
      gameData: gameData,
      roomId: roomId,
      hasGameTime: !!gameData.gameTime,
      hasCards: !!gameData.cards,
      cardsLength: gameData.cards?.length || 0
    });
    
    if (!gameData.gameSettings || !gameData.gameSettings.numPairs) {
      console.error(`[useGameState] [${new Date().toISOString()}] Missing required game settings from server:`, {
        gameData: gameData,
        roomId: roomId,
        missingGameSettings: !gameData.gameSettings,
        missingNumPairs: !gameData.gameSettings?.numPairs
      });
      return;
    }

    // Get game time from gameSettings or fallback to gameTime field
    const actualGameTime = gameData.gameSettings.gameTime || gameData.gameTime || 60;
    const pairCount = gameData.gameSettings.numPairs;
    
    // Generate cards on client side based on pair count
    const generatedCards = generateCards(pairCount * 2);
    
    console.log(`[useGameState] [${new Date().toISOString()}] Processing game initialization:`, {
      actualGameTime: actualGameTime,
      pairCount: pairCount,
      totalCards: generatedCards.length,
      roomId: roomId,
      gameSettingsGameTime: gameData.gameSettings.gameTime,
      gameDataGameTime: gameData.gameTime
    });
    
    // 儲存遊戲設定到 localStorage
    if (roomId) {
      const settingsToStore = {
        duration: actualGameTime / 60, // 秒轉分鐘
        pairs: pairCount
      };
      localStorage.setItem(`game_${roomId}`, JSON.stringify(settingsToStore));
      console.log(`[useGameState] [${new Date().toISOString()}] Stored game settings to localStorage:`, {
        roomId: roomId,
        settingsToStore: settingsToStore
      });
    }

    setGameState(prev => {
      const newState = {
        ...prev,
        cards: generatedCards,
        timeLeft: actualGameTime,
        status: 'playing' as GameState['status']
      };
      console.log(`[useGameState] [${new Date().toISOString()}] Updated game state:`, {
        previousState: prev,
        newState: newState,
        roomId: roomId
      });
      return newState;
    });
    
    console.log(`[useGameState] [${new Date().toISOString()}] Game initialization completed:`, {
      actualGameTime: actualGameTime,
      pairCount: pairCount,
      roomId: roomId
    });
  }, [roomId]);

  // 更新分數
  const updateScore = useCallback((score: number) => {
    console.log(`[useGameState] [${new Date().toISOString()}] Updating score:`, {
      newScore: score,
      roomId: roomId
    });
    setGameState(prev => {
      const newState = { ...prev, score };
      console.log(`[useGameState] [${new Date().toISOString()}] Score updated:`, {
        previousScore: prev.score,
        newScore: score,
        roomId: roomId
      });
      return newState;
    });
  }, [roomId]);

  // 更新排名
  const updateRank = useCallback((rank: number, totalPlayers: number) => {
    console.log(`[useGameState] [${new Date().toISOString()}] Updating rank:`, {
      newRank: rank,
      totalPlayers: totalPlayers,
      roomId: roomId
    });
    setGameState(prev => {
      const newState = { ...prev, rank, totalPlayers };
      console.log(`[useGameState] [${new Date().toISOString()}] Rank updated:`, {
        previousRank: prev.rank,
        previousTotalPlayers: prev.totalPlayers,
        newRank: rank,
        newTotalPlayers: totalPlayers,
        roomId: roomId
      });
      return newState;
    });
  }, [roomId]);



  // 翻牌
  const flipCard = useCallback((suit: string, value: string) => {
    console.log(`[useGameState] [${new Date().toISOString()}] Flipping card:`, {
      suit: suit,
      value: value,
      roomId: roomId
    });
    setGameState(prev => {
      const currentCard = prev.cards.find(card => card.suit === suit && card.value === value);
      if (currentCard) {
        console.log(`[useGameState] [${new Date().toISOString()}] Card found:`, {
          suit: suit,
          value: value,
          roomId: roomId
        });
      }
      
      const newState = {
        ...prev,
        cards: prev.cards.map(card => {
          if (card.suit === suit && card.value === value) {
            const updatedCard = { 
              ...card, 
              isFlipped: true
            };
            console.log(`[useGameState] [${new Date().toISOString()}] Card updated:`, {
              suit: suit,
              value: value,
              isFlipped: updatedCard.isFlipped,
              roomId: roomId
            });
            return updatedCard;
          }
          return card;
        })
      };
      
      console.log(`[useGameState] [${new Date().toISOString()}] Card flipped:`, {
        suit: suit,
        value: value,
        roomId: roomId,
        flippedCardsCount: newState.cards.filter(c => c.isFlipped).length,
        totalCards: newState.cards.length
      });
      return newState;
    });
  }, [roomId]);

  // 翻回卡片
  const flipCardsBack = useCallback((cards: { suit: string; value: string }[]) => {
    console.log(`[useGameState] [${new Date().toISOString()}] Flipping cards back:`, {
      cards: cards,
      roomId: roomId
    });
    setGameState(prev => {
      // 記錄被翻回的卡片信息
      const cardsToFlipBack = prev.cards.filter(card => 
        cards.some(c => c.suit === card.suit && c.value === card.value)
      );
      console.log(`[useGameState] [${new Date().toISOString()}] Cards being flipped back details:`, {
        cards: cards,
        cardValues: cardsToFlipBack.map(card => ({ suit: card.suit, value: card.value })),
        roomId: roomId
      });
      
      const newState = {
        ...prev,
        cards: prev.cards.map(card => 
          cards.some(c => c.suit === card.suit && c.value === card.value) ? { ...card, isFlipped: false } : card
        )
      };
      console.log(`[useGameState] [${new Date().toISOString()}] Cards flipped back:`, {
        cards: cards,
        roomId: roomId,
        flippedCardsCount: newState.cards.filter(c => c.isFlipped).length,
        totalCards: newState.cards.length
      });
      return newState;
    });
  }, [roomId]);

  // 標記卡片為已匹配
  const markCardsAsMatched = useCallback((cards: { suit: string; value: string }[]) => {
    console.log(`[useGameState] [${new Date().toISOString()}] Marking cards as matched:`, {
      cards: cards,
      roomId: roomId
    });
    setGameState(prev => {
      // 記錄被標記為匹配的卡片信息
      const cardsToMatch = prev.cards.filter(card => 
        cards.some(c => c.suit === card.suit && c.value === card.value)
      );
      console.log(`[useGameState] [${new Date().toISOString()}] Cards being marked as matched details:`, {
        cards: cards,
        cardValues: cardsToMatch.map(card => ({ suit: card.suit, value: card.value })),
        roomId: roomId
      });
      
      const newState = {
        ...prev,
        cards: prev.cards.map(card => 
          cards.some(c => c.suit === card.suit && c.value === card.value) ? { ...card, isMatched: true, isFlipped: true } : card
        )
      };
      console.log(`[useGameState] [${new Date().toISOString()}] Cards marked as matched:`, {
        cards: cards,
        roomId: roomId,
        matchedCardsCount: newState.cards.filter(c => c.isMatched).length,
        totalCards: newState.cards.length,
        gameProgress: `${newState.cards.filter(c => c.isMatched).length}/${newState.cards.length} cards matched`
      });
      return newState;
    });
  }, [roomId]);

  // 更新遊戲狀態
  const updateGameStatus = useCallback((status: GameState['status']) => {
    console.log(`[useGameState] [${new Date().toISOString()}] Updating game status:`, {
      newStatus: status,
      roomId: roomId
    });
    setGameState(prev => {
      const newState = { ...prev, status };
      console.log(`[useGameState] [${new Date().toISOString()}] Game status updated:`, {
        previousStatus: prev.status,
        newStatus: status,
        roomId: roomId
      });
      return newState;
    });
  }, [roomId]);

  // 更新剩餘時間
  const updateTimeLeft = useCallback((timeLeft: number) => {
    setGameState(prev => {
      const newState = { ...prev, timeLeft };
      // 只在時間變化較大時記錄日誌，避免過多的日誌
      if (Math.abs(prev.timeLeft - timeLeft) > 5 || timeLeft <= 10) {
        console.log(`[useGameState] [${new Date().toISOString()}] Time updated:`, {
          previousTime: prev.timeLeft,
          newTime: timeLeft,
          roomId: roomId
        });
      }
      return newState;
    });
  }, [roomId]);

  return {
    gameState,
    setGameState,
    initializeGame,
    updateScore,
    updateRank,
    flipCard,
    flipCardsBack,
    markCardsAsMatched,
    updateGameStatus,
    updateTimeLeft,
    getActualGameDuration,
    storedGameSettings
  };
};