import { useState, useCallback } from 'react';
import type { GameState, RedEnvelopeItem, GameSettings } from '../types/index';
import { generateEnvelopes, generateSingleEnvelope } from '../../player/envelopeGenerator';

interface UseGameStateProps {
  initialSettings?: GameSettings;
}

export const useGameState = ({ initialSettings }: UseGameStateProps = {}) => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'waiting',
    score: 0,
    timeLeft: initialSettings?.gameTime || 60,
    envelopes: [],
    rank: 1,
    totalPlayers: 1,
    collectedCount: 0
  });

  const [gameSettings, setGameSettings] = useState<GameSettings>(initialSettings || {
    title: '搶紅包',
    description: '快速點擊掉落的紅包來獲得分數！',
    duration: 1,
    gameTime: 60,
    envelopeCount: 50,
    dropSpeed: 1.5
  });

  // 初始化遊戲
  const initializeGame = useCallback((settings: GameSettings) => {
    setGameSettings(settings);
    setGameState((prev: GameState) => ({
      ...prev,
      status: 'playing', // 直接開始遊戲，不等待
      score: 0,
      timeLeft: settings.gameTime || settings.duration * 60,
      envelopes: [],
      rank: 1,
      totalPlayers: 1,
      collectedCount: 0
    }));
  }, []);

  // 更新遊戲狀態
  const updateStatus = useCallback((status: GameState['status']) => {
    setGameState((prev: GameState) => ({ ...prev, status }));
  }, []);

  // 更新排名
  const updateRank = useCallback((rank: number, totalPlayers?: number) => {
    setGameState((prev: GameState) => ({ 
      ...prev, 
      rank,
      ...(totalPlayers !== undefined && { totalPlayers })
    }));
  }, []);

  // 更新分數
  const updateScore = useCallback((score: number) => {
    setGameState((prev: GameState) => ({ ...prev, score }));
  }, []);

  // 更新剩餘時間
  const updateTimeLeft = useCallback((timeLeft: number) => {
    setGameState((prev: GameState) => ({ ...prev, timeLeft }));
  }, []);

  // 移除超出邊界的紅包
  const removeOutOfBoundsEnvelopes = useCallback(() => {
    setGameState((prev: GameState) => ({
      ...prev,
      envelopes: prev.envelopes.filter((envelope: RedEnvelopeItem) => envelope.y < window.innerHeight + 100)
    }));
  }, []);

  // 添加新紅包
  const addEnvelope = useCallback(() => {
    const newEnvelope = generateSingleEnvelope();
    setGameState((prev: GameState) => ({
      ...prev,
      envelopes: [...prev.envelopes, newEnvelope]
    }));
  }, []);

  // 更新紅包位置
  const updateEnvelopePositions = useCallback((deltaTime: number) => {
    setGameState((prev: GameState) => ({
      ...prev,
      envelopes: prev.envelopes.map((envelope: RedEnvelopeItem) => ({
        ...envelope,
        y: envelope.y + envelope.speed * deltaTime * gameSettings.dropSpeed
      }))
    }));
  }, [gameSettings.dropSpeed]);

  // 收集紅包
  const collectEnvelope = useCallback((envelopeId: string) => {
    setGameState((prev: GameState) => {
      const envelope = prev.envelopes.find((e: RedEnvelopeItem) => e.id === envelopeId);
      if (!envelope || envelope.isCollected) return prev;

      return {
        ...prev,
        score: prev.score + envelope.value,
        collectedCount: prev.collectedCount + 1,
        envelopes: prev.envelopes.map((e: RedEnvelopeItem) => 
          e.id === envelopeId ? { ...e, isCollected: true } : e
        )
      };
    });
  }, []);

  // 重置遊戲
  const resetGame = useCallback(() => {
    setGameState((prev: GameState) => ({
      ...prev,
      status: 'waiting',
      score: 0,
      timeLeft: gameSettings.gameTime || gameSettings.duration * 60,
      envelopes: [],
      rank: 1,
      totalPlayers: 1,
      collectedCount: 0
    }));
  }, [gameSettings]);

  return {
    gameState,
    gameSettings,
    setGameState,
    setGameSettings,
    initializeGame,
    updateStatus,
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