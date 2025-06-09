import { useState, useCallback } from 'react';
import type { GameState, RedEnvelopeItem, GameSettings } from '../types';
import { generateEnvelopes } from '../utils/envelopeGenerator';

interface UseGameStateProps {
  initialSettings?: GameSettings;
}

export const useGameState = ({ initialSettings }: UseGameStateProps = {}) => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'waiting',
    timeLeft: initialSettings?.gameTime || 60, // 預設1分鐘
    envelopes: [],
    score: 0,
    rank: 0,
    totalPlayers: 1,
    collectedCount: 0
  });

  // 初始化遊戲
  const initializeGame = useCallback((gameData: any) => {
    console.log('[RedEnvelopeGame] Initializing game with data:', gameData);
    
    const gameSettings = gameData.gameSettings || initialSettings;
    const gameTime = gameData.gameTime || gameSettings?.gameTime || 60;
    
    // 生成紅包
    const envelopes = generateEnvelopes(gameSettings?.envelopeCount || 50);
    
    setGameState({
      status: 'playing',
      timeLeft: gameTime,
      envelopes: envelopes,
      score: 0,
      rank: 0,
      totalPlayers: 1,
      collectedCount: 0
    });
  }, [initialSettings]);

  // 更新遊戲狀態
  const updateGameStatus = useCallback((status: GameState['status']) => {
    setGameState(prev => ({ ...prev, status }));
  }, []);

  // 更新排名
  const updateRank = useCallback((rank: number, totalPlayers: number) => {
    setGameState(prev => ({ ...prev, rank, totalPlayers }));
  }, []);

  // 更新分數
  const updateScore = useCallback((score: number) => {
    setGameState(prev => ({ ...prev, score }));
  }, []);

  // 更新剩餘時間
  const updateTimeLeft = useCallback((timeLeft: number) => {
    setGameState(prev => ({ ...prev, timeLeft }));
  }, []);

  // 收集紅包
  const collectEnvelope = useCallback((envelopeId: string) => {
    setGameState(prev => {
      const envelope = prev.envelopes.find(e => e.id === envelopeId);
      if (!envelope || envelope.isCollected) {
        return prev;
      }

      const updatedEnvelopes = prev.envelopes.map(e => 
        e.id === envelopeId ? { ...e, isCollected: true } : e
      );

      return {
        ...prev,
        envelopes: updatedEnvelopes,
        score: prev.score + envelope.value,
        collectedCount: prev.collectedCount + 1
      };
    });
  }, []);

  // 更新紅包位置
  const updateEnvelopePositions = useCallback((deltaTime: number) => {
    setGameState(prev => {
      const updatedEnvelopes = prev.envelopes.map(envelope => {
        if (envelope.isCollected) return envelope;
        
        return {
          ...envelope,
          y: envelope.y + envelope.speed * deltaTime * 0.1 // 調整速度
        };
      });

      return {
        ...prev,
        envelopes: updatedEnvelopes
      };
    });
  }, []);

  // 移除超出螢幕的紅包
  const removeOutOfBoundsEnvelopes = useCallback(() => {
    setGameState(prev => {
      const filteredEnvelopes = prev.envelopes.filter(envelope => 
        envelope.y <= window.innerHeight + 50
      );

      return {
        ...prev,
        envelopes: filteredEnvelopes
      };
    });
  }, []);

  // 添加新紅包
  const addEnvelope = useCallback((envelope: RedEnvelopeItem) => {
    setGameState(prev => ({
      ...prev,
      envelopes: [...prev.envelopes, envelope]
    }));
  }, []);

  // 重置遊戲
  const resetGame = useCallback(() => {
    setGameState({
      status: 'waiting',
      timeLeft: initialSettings?.gameTime || 60,
      envelopes: [],
      score: 0,
      rank: 0,
      totalPlayers: 1,
      collectedCount: 0
    });
  }, [initialSettings]);

  return {
    gameState,
    setGameState,
    initializeGame,
    updateGameStatus,
    updateRank,
    updateScore,
    updateTimeLeft,
    collectEnvelope,
    updateEnvelopePositions,
    removeOutOfBoundsEnvelopes,
    addEnvelope,
    resetGame
  };
};