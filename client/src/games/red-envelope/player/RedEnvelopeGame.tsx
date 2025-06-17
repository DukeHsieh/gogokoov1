import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundEffects } from '../utils/soundEffects';
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

// 紅包介面
interface RedEnvelope {
  id: string;
  x: number;
  y: number;
  value: number;
  speed: number;
  size: 'small' | 'medium' | 'large';
  isCollected: boolean;
  createdAt: number;
}

// 遊戲狀態介面
interface GameState {
  status: 'waiting' | 'playing' | 'ended';
  timeLeft: number;
  envelopes: RedEnvelope[];
  score: number;
  rank: number;
  totalPlayers: number;
  collectedCount: number;
  dogPosition: number; // 狗狗的X位置 (0-100%)
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
  const animationRef = useRef<number>();
  const lastScoreUpdateRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());

  // 遊戲狀態
  const [gameState, setGameState] = useState<GameState>({
    status: 'waiting',
    timeLeft: gameData?.gameSettings?.gameTime || DEFAULT_GAME_SETTINGS.gameTime || 60,
    envelopes: [],
    score: 0,
    rank: 1,
    totalPlayers: 1,
    collectedCount: 0,
    dogPosition: 50 // 狗狗初始位置在中間
  });

  // 初始化遊戲
  useEffect(() => {
    console.log('[RedEnvelopeGame] Initializing game');
    setGameState(prev => ({
      ...prev,
      status: 'playing',
      timeLeft: gameData?.gameSettings?.gameTime || DEFAULT_GAME_SETTINGS.gameTime || 60
    }));
    soundEffects.gameStart();
    startGameTimer();
  }, [gameData]);

  // 開始遊戲計時器
  const startGameTimer = useCallback(() => {
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
    }

    gameTimerRef.current = setInterval(() => {
      setGameState(prev => {
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft <= 0) {
          // 遊戲結束
          if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current);
          }
          onGameEnd?.(prev.score);
          return {
            ...prev,
            status: 'ended',
            timeLeft: 0
          };
        }
        return {
          ...prev,
          timeLeft: newTimeLeft
        };
      });
    }, 1000);
  }, [onGameEnd]);

  // 生成紅包
  const generateEnvelope = useCallback((): RedEnvelope => {
    const sizes = ['small', 'medium', 'large'] as const;
    const sizeWeights = [0.6, 0.3, 0.1]; // 小、中、大的機率
    const randomValue = Math.random();
    let size: 'small' | 'medium' | 'large' = 'small';
    
    if (randomValue < sizeWeights[0]) {
      size = 'small';
    } else if (randomValue < sizeWeights[0] + sizeWeights[1]) {
      size = 'medium';
    } else {
      size = 'large';
    }

    const values = {
      small: Math.floor(Math.random() * 5) + 1, // 1-5分
      medium: Math.floor(Math.random() * 10) + 5, // 5-15分
      large: Math.floor(Math.random() * 15) + 10 // 10-25分
    };

    return {
      id: `envelope_${Date.now()}_${Math.random()}`,
      x: Math.random() * 90 + 5, // 5%-95%的位置
      y: -10, // 從畫面上方開始
      value: values[size],
      speed: Math.random() * 1 + 0.5, // 0.5-1.5的速度（更慢）
      size,
      isCollected: false,
      createdAt: Date.now()
    };
  }, []);

  // 持續生成紅包
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const spawnInterval = setInterval(() => {
      // 隨機生成1-3個紅包
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            envelopes: [...prev.envelopes, generateEnvelope()]
          }));
        }, i * 200);
      }
    }, 1500); // 每1.5秒生成一批

    return () => clearInterval(spawnInterval);
  }, [gameState.status, generateEnvelope]);

  // 遊戲動畫循環
  const gameLoop = useCallback(() => {
    if (gameState.status !== 'playing') return;

    setGameState(prev => {
      const updatedEnvelopes = prev.envelopes
        .map(envelope => ({
          ...envelope,
          y: envelope.y + envelope.speed
        }))
        .filter(envelope => envelope.y < 110 && !envelope.isCollected); // 移除超出畫面的紅包

      return {
        ...prev,
        envelopes: updatedEnvelopes
      };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.status]);

  // 開始動畫循環
  useEffect(() => {
    if (gameState.status === 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.status, gameLoop]);

  // 鍵盤控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.status !== 'playing') return;
      keysPressed.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    const moveLoop = () => {
      if (gameState.status !== 'playing') return;

      setGameState(prev => {
        let newDogPosition = prev.dogPosition;
        const moveSpeed = 3; // 移動速度

        if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
          newDogPosition = Math.max(0, newDogPosition - moveSpeed);
        }
        if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
          newDogPosition = Math.min(100, newDogPosition + moveSpeed);
        }

        return {
          ...prev,
          dogPosition: newDogPosition
        };
      });

      requestAnimationFrame(moveLoop);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    moveLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status]);

  // 碰撞檢測
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const checkCollisions = () => {
      setGameState(prev => {
        const dogX = prev.dogPosition;
        const dogY = 85; // 狗狗在畫面底部
        const dogWidth = 8; // 狗狗寬度
        const dogHeight = 8; // 狗狗高度

        let newScore = prev.score;
        let newCollectedCount = prev.collectedCount;
        const updatedEnvelopes = prev.envelopes.map(envelope => {
          if (envelope.isCollected) return envelope;

          // 檢查碰撞
          const envelopeSize = envelope.size === 'small' ? 4 : envelope.size === 'medium' ? 6 : 8;
          const distance = Math.sqrt(
            Math.pow(envelope.x - dogX, 2) + Math.pow(envelope.y - dogY, 2)
          );

          if (distance < (dogWidth + envelopeSize) / 2) {
            // 碰撞發生
            newScore += envelope.value;
            newCollectedCount += 1;
            soundEffects.collect?.();
            
            // 顯示分數動畫
            showScoreAnimation(envelope.x, envelope.y, envelope.value);
            
            // 通知服務器
            onEnvelopeCollected?.(envelope.id, envelope.value);
            
            return {
              ...envelope,
              isCollected: true
            };
          }

          return envelope;
        });

        return {
          ...prev,
          envelopes: updatedEnvelopes,
          score: newScore,
          collectedCount: newCollectedCount
        };
      });
    };

    const collisionInterval = setInterval(checkCollisions, 16); // 60fps
    return () => clearInterval(collisionInterval);
  }, [gameState.status, onEnvelopeCollected]);

  // WebSocket 連接和通信
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (roomId) {
      // 建立WebSocket連接
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${roomId}&nickname=${encodeURIComponent(playerNickname)}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('[RedEnvelopeGame] WebSocket connected');
        setIsConnected(true);
      };
      
      wsRef.current.onclose = () => {
        console.log('[RedEnvelopeGame] WebSocket disconnected');
        setIsConnected(false);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('[RedEnvelopeGame] WebSocket error:', error);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('[RedEnvelopeGame] Failed to parse WebSocket message:', error);
        }
      };
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, playerNickname]);

  // 處理WebSocket消息
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'platformGameStarted':
        console.log('[RedEnvelopeGame] Game started:', message);
        if (message.data && message.data.gameData) {
          setGameState(prev => ({
            ...prev,
            status: 'playing',
            timeLeft: message.data.gameData.timeLeft || prev.timeLeft
          }));
        }
        break;
      case 'timeUpdate':
        console.log('[RedEnvelopeGame] Time update:', message);
        if (message.data && typeof message.data.timeLeft === 'number') {
          setGameState(prev => ({
            ...prev,
            timeLeft: message.data.timeLeft
          }));
        }
        break;
      case 'leaderboard':
        console.log('[RedEnvelopeGame] Leaderboard update:', message);
        if (message.data && Array.isArray(message.data)) {
          const playerRanking = message.data.find((r: any) => r.nickname === playerNickname);
          if (playerRanking) {
            setGameState(prev => ({
              ...prev,
              rank: playerRanking.rank,
              totalPlayers: message.data.length
            }));
          }
        }
        break;
      case 'redEnvelopeGameEnd':
        console.log('[RedEnvelopeGame] Game ended:', message);
        setGameState(prev => ({
          ...prev,
          status: 'ended'
        }));
        if (gameTimerRef.current) {
          clearInterval(gameTimerRef.current);
        }
        onGameEnd?.(gameState.score);
        break;
      default:
        console.log('[RedEnvelopeGame] Unhandled WebSocket message:', message);
    }
  };

  // 發送分數更新到服務器
  const sendScoreUpdate = useCallback((score: number, collectedCount: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'redEnvelopeScoreUpdate',
        data: {
          totalScore: score,
          collectedCount
        }
      };
      wsRef.current.send(JSON.stringify(message));
      console.log('[RedEnvelopeGame] Sent score update:', message);
    }
  }, []);

  // 分數更新通知
  useEffect(() => {
    if (gameState.score !== lastScoreUpdateRef.current) {
      onScoreUpdate?.(gameState.score);
      // 發送分數更新到服務器
      sendScoreUpdate(gameState.score, gameState.collectedCount);
      lastScoreUpdateRef.current = gameState.score;
    }
  }, [gameState.score, gameState.collectedCount, onScoreUpdate, sendScoreUpdate]);

  // 顯示分數動畫
  const showScoreAnimation = (x: number, y: number, score: number) => {
    const scoreElement = document.createElement('div');
    scoreElement.textContent = `+${score}`;
    scoreElement.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: ${y}%;
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

    setTimeout(() => {
      if (scoreElement.parentNode) {
        scoreElement.parentNode.removeChild(scoreElement);
      }
    }, 1000);
  };

  // 吉卜力狗狗SVG組件
  const GhibliDog = ({ position }: { position: number }) => (
    <div
      style={{
        position: 'absolute',
        left: `${position}%`,
        bottom: '10%',
        transform: 'translateX(-50%)',
        width: '80px',
        height: '80px',
        zIndex: 100
      }}
    >
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* 狗狗身體 */}
        <ellipse cx="40" cy="55" rx="25" ry="15" fill="#8B4513" />
        
        {/* 狗狗頭部 */}
        <circle cx="40" cy="35" r="20" fill="#D2691E" />
        
        {/* 狗狗耳朵 */}
        <ellipse cx="28" cy="25" rx="8" ry="15" fill="#8B4513" transform="rotate(-30 28 25)" />
        <ellipse cx="52" cy="25" rx="8" ry="15" fill="#8B4513" transform="rotate(30 52 25)" />
        
        {/* 狗狗眼睛 */}
        <circle cx="33" cy="30" r="3" fill="#000" />
        <circle cx="47" cy="30" r="3" fill="#000" />
        <circle cx="34" cy="29" r="1" fill="#FFF" />
        <circle cx="48" cy="29" r="1" fill="#FFF" />
        
        {/* 狗狗鼻子 */}
        <ellipse cx="40" cy="38" rx="2" ry="1.5" fill="#000" />
        
        {/* 狗狗嘴巴 */}
        <path d="M 40 40 Q 35 45 30 42" stroke="#000" strokeWidth="2" fill="none" />
        <path d="M 40 40 Q 45 45 50 42" stroke="#000" strokeWidth="2" fill="none" />
        
        {/* 狗狗腿 */}
        <rect x="25" y="65" width="6" height="12" fill="#8B4513" rx="3" />
        <rect x="35" y="65" width="6" height="12" fill="#8B4513" rx="3" />
        <rect x="45" y="65" width="6" height="12" fill="#8B4513" rx="3" />
        <rect x="55" y="65" width="6" height="12" fill="#8B4513" rx="3" />
        
        {/* 狗狗尾巴 */}
        <ellipse cx="65" cy="50" rx="4" ry="12" fill="#8B4513" transform="rotate(45 65 50)" />
      </svg>
    </div>
  );

  // 紅包組件
  const RedEnvelopeComponent = ({ envelope }: { envelope: RedEnvelope }) => {
    const size = envelope.size === 'small' ? 40 : envelope.size === 'medium' ? 60 : 80;
    
    return (
      <div
        style={{
          position: 'absolute',
          left: `${envelope.x}%`,
          top: `${envelope.y}%`,
          transform: 'translateX(-50%)',
          width: `${size}px`,
          height: `${size}px`,
          opacity: envelope.isCollected ? 0 : 1,
          transition: envelope.isCollected ? 'opacity 0.3s ease-out' : 'none',
          zIndex: 50
        }}
      >
        <svg width={size} height={size} viewBox="0 0 100 100">
          {/* 紅包背景 */}
          <rect x="10" y="15" width="80" height="70" fill="#DC143C" rx="8" />
          
          {/* 紅包裝飾 */}
          <rect x="15" y="20" width="70" height="60" fill="#B22222" rx="5" />
          
          {/* 金色裝飾線 */}
          <rect x="20" y="25" width="60" height="2" fill="#FFD700" />
          <rect x="20" y="73" width="60" height="2" fill="#FFD700" />
          
          {/* 中間的福字 */}
          <circle cx="50" cy="50" r="15" fill="#FFD700" />
          <text x="50" y="55" textAnchor="middle" fontSize="16" fill="#DC143C" fontWeight="bold">福</text>
          
          {/* 分數顯示 */}
          <text x="50" y="90" textAnchor="middle" fontSize="10" fill="#FFD700" fontWeight="bold">
            {envelope.value}
          </text>
        </svg>
      </div>
    );
  };

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={gameContainerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)', // 簡單的天空到草地漸變
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* 倒數時間和分數顯示 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: 'bold',
        zIndex: 200,
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{ marginBottom: '8px' }}>⏰ 時間: {Math.max(0, gameState.timeLeft)}秒</div>
        <div style={{ marginBottom: '8px' }}>🏆 分數: {gameState.score}</div>
        <div>🧧 收集: {gameState.collectedCount}個</div>
      </div>

        {/* 控制說明和連接狀態 */}
         {gameState.status === 'playing' && (
           <div style={{
             position: 'absolute',
             top: '10px',
             right: '10px',
             background: 'rgba(0,0,0,0.7)',
             color: 'white',
             padding: '10px',
             borderRadius: '8px',
             fontSize: '14px',
             zIndex: 200
           }}>
             <div>使用 ← → 或 A D 鍵移動狗狗</div>
             <div>接住紅包得分！</div>
             <div style={{
               marginTop: '5px',
               fontSize: '12px',
               color: isConnected ? '#4CAF50' : '#f44336'
             }}>
               {isConnected ? '🟢 已連線' : '🔴 未連線'}
             </div>
           </div>
         )}

        {/* 紅包渲染 */}
        {gameState.envelopes.map(envelope => (
          <RedEnvelopeComponent key={envelope.id} envelope={envelope} />
        ))}

        {/* 吉卜力狗狗 */}
        <GhibliDog position={gameState.dogPosition} />

        {/* 遊戲結束畫面 */}
        {gameState.status === 'ended' && (
          <div className="game-over-screen">
            <div className="game-over-content">
              <h1 className="game-over-title">🎉 時間到！遊戲結束！ 🎉</h1>
              <div className="game-over-announcement">
                <p className="announcement-text">恭喜完成紅包大戰！</p>
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
  );
};