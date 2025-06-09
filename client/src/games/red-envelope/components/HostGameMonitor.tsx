import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import type { Player, GameState } from '../types';
import { formatTime } from '../utils/envelopeGenerator';
import { UI_CONFIG } from '../config/gameConfig';
import WebSocketManager from '../../../utils/WebSocketManager';
import { CircularProgress, Box, Typography } from '@mui/material';

const HostGameMonitor: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state as any;
  const playerNickname = gameState?.playerNickname || 'Host';
  const isHost = gameState?.isHost || true;
  
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentGameState, setCurrentGameState] = useState<GameState>({
    status: 'waiting',
    timeLeft: 0,
    envelopes: [],
    score: 0,
    rank: 1,
    totalPlayers: 0,
    collectedCount: 0
  });
  const [gameSettings, setGameSettings] = useState<any>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Check if user is host, redirect if not
  useEffect(() => {
    if (!isHost) {
      navigate(`/game/${roomId}`, { state: gameState });
      return;
    }
  }, [isHost, navigate, roomId, gameState]);

  // Load game settings from localStorage
  useEffect(() => {
    console.log('[HOST] Checking roomId:', roomId);
    if (roomId) {
      const storedSettings = localStorage.getItem(`game_${roomId}`);
      console.log('[HOST] Loading game settings for room:', roomId);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setGameSettings(settings);
        console.log('[HOST] Loaded game settings:', settings);
      }
    }
  }, [roomId]);

  // WebSocket connection and message handling
  useEffect(() => {
    if (!roomId || !isHost) return;

    const wsManager = WebSocketManager.getInstance();
    
    const setupConnection = async () => {
      let websocket;
      
      try {
        websocket = wsManager.getConnection();
        if (!websocket) {
          console.log('[HOST] No existing connection found, creating new one');
          websocket = await wsManager.connect(roomId, playerNickname, isHost);
        } else {
          console.log('[HOST] Using existing WebSocket connection');
        }
       
        wsRef.current = websocket;
        setIsConnected(true);

        // Auto send start game message if settings are available
        console.log('[HOST] Checking if host and settings are available:', isHost, gameSettings);
        if (isHost && gameSettings) {
          console.log('[HOST] Sending start game message with settings:', gameSettings);
          const startGameMessage = {
            type: 'hostStartGame',
            data: {
              gameType: 'redenvelope',
              gameTime: gameSettings.duration * 60,
              envelopeCount: gameSettings.envelopeCount,
              minValue: gameSettings.minValue,
              maxValue: gameSettings.maxValue
            }
          };
          wsManager.send(startGameMessage);
        }

        // Add message handler for this component
        wsManager.addMessageHandler('redEnvelopeHostMonitor', (message: any) => {
          console.log('[HOST] Received message:', message);

          switch (message.type) {
            case 'gameData':
              console.log('[HOST] Received game data:', message);
              setCurrentGameState(prev => ({
                ...prev,
                status: 'playing',
                timeLeft: message.gameTime || 60
              }));
              break;

            case 'timeLeft':
            case 'gameTimeUpdate':
            case 'timeUpdate':
              console.log('[HOST] Received time update:', message.timeLeft, 'type:', message.type);
              setCurrentGameState(prev => ({
                ...prev,
                timeLeft: message.timeLeft
              }));
              break;

            case 'gameEnded':
              console.log('[HOST] Game ended:', message.reason);
              setCurrentGameState(prev => ({
                ...prev,
                status: 'ended'
              }));
              // Clear timer
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              break;

            case 'playerListUpdate':
              console.log('[HOST] Received player list update:', message);
              if (message.data && message.data.players) {
                const newPlayers = message.data.players.map((player: any) => ({
                  nickname: player.nickname,
                  score: player.score || 0,
                  isConnected: true,
                  isHost: player.isHost || false,
                  avatar: player.avatar
                }));
                setPlayers(newPlayers);
                setCurrentGameState(prev => ({
                  ...prev,
                  totalPlayers: newPlayers.length
                }));
              }
              break;

            case 'waiting':
              console.log('[HOST] Game in waiting state');
              setCurrentGameState(prev => ({
                ...prev,
                status: 'waiting'
              }));
              break;

            case 'platformNotification':
              console.log('[HOST] Platform notification:', message.message);
              break;

            case 'gameGameStarted':
              console.log('[HOST] Game started notification');
              setCurrentGameState(prev => ({
                ...prev,
                status: 'playing'
              }));
              break;

            default:
              console.log('[HOST] Unknown message type:', message.type);
          }
        });

      } catch (error) {
        console.error('[HOST] WebSocket connection error:', error);
        setIsConnected(false);
      }
    };

    setupConnection();

    return () => {
      const wsManager = WebSocketManager.getInstance();
      wsManager.removeMessageHandler('redEnvelopeHostMonitor');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [roomId, isHost, playerNickname, gameSettings]);

  // 結束遊戲
  const handleEndGame = useCallback(() => {
    const wsManager = WebSocketManager.getInstance();
    
    if (!wsManager.isConnected()) {
      console.error('[HOST] Cannot end game: WebSocket not connected');
      return;
    }

    console.log('[HOST] Ending game');
    
    const endGameMessage = {
      type: 'hostEndGame',
      data: {
        gameType: 'redenvelope'
      }
    };
    
    wsManager.send(endGameMessage);
    console.log('[HOST] Sent end game message:', endGameMessage);
    
    // 清理計時器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 開始遊戲
  const handleStartGame = useCallback(() => {
    const wsManager = WebSocketManager.getInstance();
    
    if (!wsManager.isConnected() || !gameSettings) {
      console.error('[HOST] Cannot start game: WebSocket not connected or no game settings');
      return;
    }

    console.log('[HOST] Starting game with settings:', gameSettings);
    
    const startGameMessage = {
      type: 'hostStartGame',
      data: {
        gameType: 'redenvelope',
        gameTime: gameSettings.duration * 60,
        envelopeCount: gameSettings.envelopeCount,
        minValue: gameSettings.minValue,
        maxValue: gameSettings.maxValue
      }
    };
    
    wsManager.send(startGameMessage);
    console.log('[HOST] Sent start game message:', startGameMessage);
  }, [gameSettings]);

  const [sortedPlayers, setSortedPlayers] = useState<Player[]>([]);
  const [gameStats, setGameStats] = useState({
    totalScore: 0,
    averageScore: 0,
    topScore: 0,
    totalCollected: 0
  });

  // 更新玩家排名
  useEffect(() => {
    const sorted = [...players].sort((a, b) => {
      if (a.isHost && !b.isHost) return 1;
      if (!a.isHost && b.isHost) return -1;
      return b.score - a.score;
    });
    setSortedPlayers(sorted);

    // 計算統計數據
    const nonHostPlayers = players.filter(p => !p.isHost);
    const totalScore = nonHostPlayers.reduce((sum, p) => sum + p.score, 0);
    const averageScore = nonHostPlayers.length > 0 ? totalScore / nonHostPlayers.length : 0;
    const topScore = nonHostPlayers.length > 0 ? Math.max(...nonHostPlayers.map(p => p.score)) : 0;
    const totalCollected = nonHostPlayers.reduce((sum, p) => sum + (p.collectedCount || 0), 0);

    setGameStats({
      totalScore,
      averageScore,
      topScore,
      totalCollected
    });
  }, [players]);

  // 如果還沒連接到 WebSocket，顯示載入狀態
  if (!isConnected) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
        flexDirection="column"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          正在連接到房間 {roomId}...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          連接狀態: {isConnected ? '已連接' : '連接中...'}
        </Typography>
      </Box>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🏆';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#ffd700';
      case 2: return '#c0c0c0';
      case 3: return '#cd7f32';
      default: return UI_CONFIG.colors.text;
    }
  };

  const getStatusColor = () => {
    switch (currentGameState.status) {
      case 'waiting': return '#ffa502';
      case 'playing': return '#2ed573';
      case 'ended': return '#ff4757';
      default: return '#747d8c';
    }
  };

  const getStatusText = () => {
    switch (currentGameState.status) {
      case 'waiting': return '等待開始';
      case 'playing': return '遊戲進行中';
      case 'ended': return '遊戲結束';
      default: return '未知狀態';
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        fontFamily: UI_CONFIG.fonts.body,
        color: 'white'
      }}
    >
      {/* 標題區域 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '30px',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: UI_CONFIG.borderRadius,
          backdropFilter: 'blur(10px)'
        }}
      >
        <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#fff' }}>
          🧧 搶紅包 - 主持人監控 🧧
        </h1>
        <p style={{ fontSize: '16px', opacity: 0.9 }}>
          {gameSettings?.description || '監控遊戲進度和玩家排名'}
        </p>
      </div>

      {/* 遊戲控制區域 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '30px'
        }}
      >
        <div
          style={{
            background: getStatusColor(),
            color: 'white',
            padding: '12px 24px',
            borderRadius: '25px',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span>狀態: {getStatusText()}</span>
        </div>
        
        {currentGameState.status === 'playing' && (
          <div
            style={{
              background: currentGameState.timeLeft <= 10 ? '#ff4757' : '#2ed573',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '25px',
              fontSize: '18px',
              fontWeight: 'bold',
              animation: currentGameState.timeLeft <= 10 ? 'pulse 1s infinite' : 'none'
            }}
          >
            ⏰ {formatTime(currentGameState.timeLeft)}
          </div>
        )}
        
        {currentGameState.status === 'waiting' && handleStartGame && (
          <button
            onClick={handleStartGame}
            style={{
              background: '#2ed573',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#26d0ce';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#2ed573';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🚀 開始遊戲
          </button>
        )}
        
        {currentGameState.status === 'playing' && handleEndGame && (
          <button
            onClick={handleEndGame}
            style={{
              background: '#ff4757',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '25px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ff3742';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#ff4757';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ⏹️ 結束遊戲
          </button>
        )}
      </div>

      {/* 統計數據區域 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: UI_CONFIG.borderRadius,
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h3 style={{ fontSize: '16px', marginBottom: '10px', opacity: 0.8 }}>總玩家數</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffd700' }}>{players.length}</p>
        </div>
        
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: UI_CONFIG.borderRadius,
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h3 style={{ fontSize: '16px', marginBottom: '10px', opacity: 0.8 }}>總分數</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff6b9d' }}>
            {gameStats.totalScore.toLocaleString()}
          </p>
        </div>
        
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: UI_CONFIG.borderRadius,
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h3 style={{ fontSize: '16px', marginBottom: '10px', opacity: 0.8 }}>最高分</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#26d0ce' }}>
            {gameStats.topScore.toLocaleString()}
          </p>
        </div>
        
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: UI_CONFIG.borderRadius,
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h3 style={{ fontSize: '16px', marginBottom: '10px', opacity: 0.8 }}>平均分</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#a55eea' }}>
            {Math.round(gameStats.averageScore).toLocaleString()}
          </p>
        </div>
      </div>

      {/* 玩家排行榜 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: UI_CONFIG.borderRadius,
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <h2 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>
          🏆 玩家排行榜
        </h2>
        
        {sortedPlayers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>
            <p style={{ fontSize: '18px' }}>暫無玩家數據</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: index < 3 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  border: index < 3 ? '2px solid rgba(255, 215, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: getRankColor(index + 1),
                      minWidth: '40px',
                      textAlign: 'center'
                    }}
                  >
                    {getRankIcon(index + 1)}
                  </div>
                  
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                      {player.nickname}
                      {player.isHost && (
                        <span style={{ 
                          fontSize: '12px', 
                          background: '#ffa502', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          marginLeft: '10px' 
                        }}>
                          主持人
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: '14px', opacity: 0.8 }}>
                      收集: {player.collectedCount || 0} 個紅包
                    </p>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd700' }}>
                    {player.score.toLocaleString()}
                  </p>
                  <p style={{ fontSize: '14px', opacity: 0.8 }}>分</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* CSS 動畫 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default HostGameMonitor;