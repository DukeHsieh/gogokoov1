import React, { useEffect, useCallback, useRef } from 'react';
import { GameBackground } from './GameBackground';
import { GameStatus } from './GameStatus';
import { RedEnvelope } from './RedEnvelope';
import { useGameState } from '../hooks/useGameState';
import { useGameAnimation } from '../hooks/useGameAnimation';
import { soundEffects } from '../utils/soundEffects';
import { isEnvelopeClicked } from '../utils/envelopeGenerator';
import { DEFAULT_GAME_SETTINGS } from '../config/gameConfig';
import type { GameData, Player } from '../types';

interface RedEnvelopeGameProps {
  gameData?: GameData;
  players?: Player[];
  currentPlayer?: Player;
  onScoreUpdate?: (score: number) => void;
  onGameEnd?: () => void;
  isHost?: boolean;
}

export const RedEnvelopeGame: React.FC<RedEnvelopeGameProps> = ({
  gameData,
  players = [],
  currentPlayer,
  onScoreUpdate,
  onGameEnd,
  isHost = false
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const lastScoreUpdateRef = useRef<number>(0);

  // 使用遊戲狀態管理
  const {
    gameState,
    setGameState,
    initializeGame,
    updateGameStatus,
    updateRank,
    collectEnvelope,
    updateEnvelopePositions,
    removeOutOfBoundsEnvelopes,
    resetGame
  } = useGameState({ 
    initialSettings: gameData?.gameSettings || DEFAULT_GAME_SETTINGS 
  });

  // 使用動畫管理
  const { startAnimation, stopAnimation } = useGameAnimation({
    isPlaying: gameState.status === 'playing',
    envelopes: gameState.envelopes,
    onUpdatePositions: updateEnvelopePositions,
    onRemoveOutOfBounds: removeOutOfBoundsEnvelopes
  });

  // 初始化遊戲
  useEffect(() => {
    if (gameData) {
      console.log('[RedEnvelopeGame] Initializing with game data:', gameData);
      initializeGame(gameData);
      soundEffects.gameStart();
    }
  }, [gameData, initializeGame]);

  // 遊戲計時器
  useEffect(() => {
    if (gameState.status === 'playing') {
      gameTimerRef.current = setInterval(() => {
        setGameState(prev => {
          const newTime = prev.timeLeft - 1;
          if (newTime <= 0) {
             updateGameStatus('ended');
             onGameEnd?.();
             return { ...prev, timeLeft: 0 };
           }
          return { ...prev, timeLeft: newTime };
        });
      }, 1000);
    } else {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [gameState.status, updateGameStatus, onGameEnd]);

  // 更新排名
  useEffect(() => {
    if (players.length > 0 && currentPlayer) {
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      const playerRank = sortedPlayers.findIndex(p => p.id === currentPlayer.id) + 1;
      updateRank(playerRank, players.length);
    }
  }, [players, currentPlayer, updateRank]);

  // 分數更新通知
  useEffect(() => {
    if (gameState.score !== lastScoreUpdateRef.current) {
      onScoreUpdate?.(gameState.score);
      lastScoreUpdateRef.current = gameState.score;
    }
  }, [gameState.score, onScoreUpdate]);

  // 處理紅包點擊
  const handleEnvelopeClick = useCallback((envelopeId: string) => {
    const envelope = gameState.envelopes.find(e => e.id === envelopeId);
    if (envelope && !envelope.isCollected && gameState.status === 'playing') {
      collectEnvelope(envelopeId);
      soundEffects.collect();
      
      // 顯示分數動畫
      showScoreAnimation(envelope.x, envelope.y, envelope.value);
    }
  }, [gameState.envelopes, gameState.status, collectEnvelope]);

  // 處理畫面點擊（用於觸控設備）
  const handleScreenClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState.status !== 'playing') return;

    const rect = gameContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 檢查是否點擊到紅包
    for (const envelope of gameState.envelopes) {
      if (!envelope.isCollected && isEnvelopeClicked(envelope, clickX, clickY)) {
        handleEnvelopeClick(envelope.id);
        break;
      }
    }
  }, [gameState.status, gameState.envelopes, handleEnvelopeClick]);

  // 顯示分數動畫
  const showScoreAnimation = (x: number, y: number, score: number) => {
    const scoreElement = document.createElement('div');
    scoreElement.textContent = `+${score}`;
    scoreElement.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      color: #ffd700;
      font-size: 24px;
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      animation: scoreFloat 1s ease-out forwards;
    `;

    // 添加動畫樣式
    if (!document.getElementById('score-animation-style')) {
      const style = document.createElement('style');
      style.id = 'score-animation-style';
      style.textContent = `
        @keyframes scoreFloat {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-50px) scale(1.2);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    gameContainerRef.current?.appendChild(scoreElement);

    // 1秒後移除元素
    setTimeout(() => {
      if (scoreElement.parentNode) {
        scoreElement.parentNode.removeChild(scoreElement);
      }
    }, 1000);
  };

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      stopAnimation();
    };
  }, [stopAnimation]);

  return (
    <GameBackground isPlaying={gameState.status === 'playing'}>
      <div
        ref={gameContainerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          cursor: gameState.status === 'playing' ? 'crosshair' : 'default',
          userSelect: 'none'
        }}
        onClick={handleScreenClick}
        onTouchStart={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          const rect = gameContainerRef.current?.getBoundingClientRect();
          if (rect) {
            const clickX = touch.clientX - rect.left;
            const clickY = touch.clientY - rect.top;
            
            for (const envelope of gameState.envelopes) {
              if (!envelope.isCollected && isEnvelopeClicked(envelope, clickX, clickY)) {
                handleEnvelopeClick(envelope.id);
                break;
              }
            }
          }
        }}
      >
        {/* 遊戲狀態顯示 */}
        <GameStatus 
          gameState={gameState} 
          playerName={currentPlayer?.nickname || '玩家'}
        />

        {/* 紅包渲染 */}
        {gameState.envelopes.map(envelope => (
          <RedEnvelope
            key={envelope.id}
            envelope={envelope}
            onClick={handleEnvelopeClick}
            isCollected={envelope.isCollected}
          />
        ))}

        {/* 等待開始畫面 */}
        {gameState.status === 'waiting' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
          >
            <h2 style={{ color: '#ff4757', marginBottom: '20px', fontSize: '32px' }}>
              🧧 搶紅包 🧧
            </h2>
            <p style={{ color: '#2f3542', fontSize: '18px', marginBottom: '10px' }}>
              快速點擊掉落的紅包來獲得分數！
            </p>
            <p style={{ color: '#747d8c', fontSize: '16px' }}>
              等待主持人開始遊戲...
            </p>
          </div>
        )}

        {/* 遊戲結束畫面 */}
        {gameState.status === 'ended' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              minWidth: '300px'
            }}
          >
            <h2 style={{ color: '#ff4757', marginBottom: '20px', fontSize: '32px' }}>
              🎉 遊戲結束 🎉
            </h2>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#2f3542', fontSize: '20px', marginBottom: '10px' }}>
                最終分數: <strong style={{ color: '#ff4757' }}>{gameState.score.toLocaleString()}</strong>
              </p>
              <p style={{ color: '#2f3542', fontSize: '18px', marginBottom: '10px' }}>
                收集紅包: <strong style={{ color: '#ffa502' }}>{gameState.collectedCount}</strong> 個
              </p>
              {gameState.rank > 0 && (
                <p style={{ color: '#2f3542', fontSize: '18px' }}>
                  排名: <strong style={{ color: gameState.rank <= 3 ? '#ffd700' : '#2f3542' }}>
                    {gameState.rank}/{gameState.totalPlayers}
                  </strong>
                  {gameState.rank === 1 && ' 🏆'}
                  {gameState.rank === 2 && ' 🥈'}
                  {gameState.rank === 3 && ' 🥉'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </GameBackground>
  );
};