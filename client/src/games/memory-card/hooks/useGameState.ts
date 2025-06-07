// 卡片記憶遊戲狀態管理Hook
import { useState, useCallback, useEffect } from 'react';
import type { GameState, GameData, GameSettings } from '../types';
import { generateCards } from '../utils/cardGenerator';

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
    status: 'playing',
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
  const initializeGameWithData = useCallback((gameData: GameData) => {
    console.log('Initializing game with data:', gameData);
    
    // 優先使用server傳來的設定，不使用預設值
    if (!gameData.gameSettings?.numPairs || !gameData.gameTime) {
      console.error('[useGameState] Missing required game settings from server:', gameData);
      return;
    }
    
    const pairCount = gameData.gameSettings.numPairs;
    const newCards = gameData.cards || generateCards(pairCount * 2);
    
    // 優先使用server傳來的遊戲時間，不使用localStorage或預設值
    const actualGameTime = gameData.gameTime || gameData.gameSettings.gameDuration || 60;
    
    setGameState(prev => ({
      ...prev,
      cards: newCards,
      timeLeft: actualGameTime,
      status: 'playing' as const
    }));
    
    console.log('[useGameState] Initialized game with server settings - time:', actualGameTime, 'pairs:', pairCount);
  }, [generateCards]);

  // 更新分數
  const updateScore = useCallback((score: number) => {
    setGameState(prev => ({ ...prev, score }));
  }, []);

  // 更新排名
  const updateRank = useCallback((rank: number, totalPlayers: number) => {
    setGameState(prev => ({ ...prev, rank, totalPlayers }));
  }, []);

  // 翻牌
  const flipCard = useCallback((cardId: number) => {
    setGameState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === cardId ? { ...card, isFlipped: true } : card
      )
    }));
  }, []);

  // 翻回卡片
  const flipCardsBack = useCallback((cardIds: number[]) => {
    setGameState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        cardIds.includes(card.id) ? { ...card, isFlipped: false } : card
      )
    }));
  }, []);

  // 標記配對成功
  const markCardsAsMatched = useCallback((cardIds: number[]) => {
    setGameState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        cardIds.includes(card.id) ? { ...card, isMatched: true } : card
      )
    }));
  }, []);

  // 更新遊戲狀態
  const updateGameStatus = useCallback((status: GameState['status']) => {
    setGameState(prev => ({ ...prev, status }));
  }, []);

  // 更新剩餘時間
  const updateTimeLeft = useCallback((timeLeft: number) => {
    setGameState(prev => ({ ...prev, timeLeft }));
  }, []);

  return {
    gameState,
    setGameState,
    initializeGameWithData,
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