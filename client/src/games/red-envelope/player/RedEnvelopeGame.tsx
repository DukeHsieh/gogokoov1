import React, { useEffect, useCallback, useRef } from 'react';
import { GameBackground } from './GameBackground';
import { GameStatus } from './GameStatus';
import { AnimalRedEnvelope } from './AnimalRedEnvelope';
import { useGameState } from '../utils/hooks/useGameState';
import { useGameAnimation } from '../utils/hooks/useGameAnimation';
import { useWebSocketHandler } from '../utils/hooks/useWebSocketHandler';
import { soundEffects } from '../utils/soundEffects';
import { isEnvelopeClicked } from './envelopeGenerator';
import { DEFAULT_GAME_SETTINGS } from './gameConfig';
import type { GameData, Player } from '../utils/types/index';
import './GameOverScreen.css';

interface RedEnvelopeGameProps {
  gameData?: GameData;
  players?: Player[];
  currentPlayer?: Player;
  onScoreUpdate?: (score: number) => void;
  onGameEnd?: (finalScore?: number) => void;
  onEnvelopeCollected?: (envelopeId: string, value: number) => void;
  isHost?: boolean;
  roomId?: string;
  playerNickname?: string;
}

export const RedEnvelopeGame: React.FC<RedEnvelopeGameProps> = ({
  gameData,
  players = [],
  currentPlayer,
  onScoreUpdate,
  onGameEnd,
  onEnvelopeCollected,
  isHost = false,
  roomId,
  playerNickname = 'Player'
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const lastScoreUpdateRef = useRef<number>(0);

  // 使用遊戲狀態管理
  const {
    gameState,
    setGameState,
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

  // WebSocket 處理
  const {
    isConnected,
    sendEnvelopeCollected,
    sendScoreUpdate
  } = useWebSocketHandler({
    roomId,
    playerNickname,
    isHost: false,
    onRankUpdate: (rank: number, totalPlayers: number) => {
      updateRank(rank, totalPlayers);
    },
    onScoreUpdate: (score: number) => {
      updateScore(score);
    },
    onTimeUpdate: (timeLeft: number) => {
      updateTimeLeft(timeLeft);
    },
    onGameEnded: (data: any) => {
      updateStatus('ended');
    }
  });

  // 初始化遊戲
  useEffect(() => {
    if (gameData) {
      console.log('[RedEnvelopeGame] Initializing with game data:', gameData);
      initializeGame(gameData.gameSettings);
      // 直接開始遊戲，不等待主持人
      updateStatus('playing');
      soundEffects.gameStart();
    } else {
      // 如果沒有遊戲數據，使用默認設置並直接開始
      console.log('[RedEnvelopeGame] No game data, starting with default settings');
      initializeGame(DEFAULT_GAME_SETTINGS);
      updateStatus('playing');
      soundEffects.gameStart();
    }
  }, [gameData, initializeGame, updateStatus]);

  // 持续生成红包 - 增加掉落頻率和數量
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const spawnInterval = setInterval(() => {
      // 随机生成3-6个红包，增加數量
      const count = Math.floor(Math.random() * 4) + 3;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          addEnvelope();
        }, i * 150); // 縮短間隔到150ms，讓紅包更密集
      }
    }, 1200); // 縮短到1.2秒生成一批，增加掉落頻率

    return () => {
      clearInterval(spawnInterval);
    };
  }, [gameState.status, addEnvelope]);

  // 額外的連續掉落效果
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const continuousSpawn = setInterval(() => {
      // 每隔800ms額外生成1-2個紅包
      const count = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          addEnvelope();
        }, i * 100);
      }
    }, 800);

    return () => {
      clearInterval(continuousSpawn);
    };
  }, [gameState.status, addEnvelope]);

  // 游戏计时器现在由服务器控制，移除本地计时器

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

  // 更新分數時通知服務器
  useEffect(() => {
    if (gameState.score > 0 && isConnected) {
      sendScoreUpdate(gameState.score);
    }
  }, [gameState.score, isConnected, sendScoreUpdate]);

  // 處理紅包點擊
  const handleEnvelopeClick = useCallback((envelopeId: string) => {
    const envelope = gameState.envelopes.find(e => e.id === envelopeId);
    if (!envelope || envelope.isCollected) return;

    // 收集紅包
    collectEnvelope(envelopeId);
    
    // 顯示分數動畫
    showScoreAnimation(envelope.value, envelope.x, envelope.y);
    
    // 通知服務器
    if (isConnected) {
      sendEnvelopeCollected(envelopeId, envelope.value);
    }
  }, [gameState.envelopes, collectEnvelope, isConnected, sendEnvelopeCollected]);

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

        {/* 動物紅包渲染 */}
        {gameState.envelopes.map(envelope => (
          <AnimalRedEnvelope
            key={envelope.id}
            envelope={envelope}
            onClick={handleEnvelopeClick}
            isCollected={envelope.isCollected}
          />
        ))}



        {/* 遊戲結束畫面 */}
        {gameState.status === 'ended' && (
          <div className="game-over-screen">
            <div className="game-over-content">
              <h1 className="game-over-title">🎉 時間到！遊戲結束！ 🎉</h1>
              <div className="game-over-announcement">
                <p className="announcement-text">恭喜所有玩家完成紅包大戰！</p>
              </div>
              <div className="final-stats">
                <div className="stat-item">
                  <span className="stat-label">🏆 最終得分</span>
                  <span className="stat-value">{gameState.score}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">🧧 收集數量</span>
                  <span className="stat-value">{gameState.collectedCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">📊 最終排名</span>
                  <span className="stat-value">{gameState.rank}/{gameState.totalPlayers}</span>
                </div>
              </div>
              <div className="celebration-message">
                <p>感謝參與！查看主持人畫面了解完整排行榜</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameBackground>
  );
};