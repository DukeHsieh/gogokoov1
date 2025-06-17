import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import type { Player, GameState } from '../utils/types';
import WebSocketManager from '../../../utils/WebSocketManager';
import { CircularProgress, Box, Typography } from '@mui/material';

// 背景音樂
const playBackgroundMusic = () => {
  try {
    const audio = new Audio('/sounds/red_envelope.wav');
    audio.loop = true;
    audio.volume = 0.9; // 設置音量為90%
    audio.play().catch(error => {
      console.log('背景音樂播放失敗:', error);
    });
    return audio;
  } catch (error) {
    console.log('背景音樂載入失敗:', error);
    return null;
  }
};

// 格式化時間顯示
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// UI 配置
const UI_CONFIG = {
  colors: {
    primary: '#ff4757', // 紅色主色調
    secondary: '#ffa502', // 金色輔助色
    success: '#2ed573', // 成功綠色
    background: '#f1f2f6', // 背景色
    text: '#2f3542' // 文字色
  },
  fonts: {
    title: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
    body: '"Noto Sans TC", "Microsoft JhengHei", sans-serif'
  },
  borderRadius: '12px',
  shadows: {
    card: '0 4px 12px rgba(0, 0, 0, 0.1)',
    envelope: '0 2px 8px rgba(255, 71, 87, 0.3)'
  }
};

const HostGameMonitor: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state as any;
  const playerNickname = gameState?.playerNickname || 'Host';
  const isHost = gameState?.isHost || true;
  const initialGameData = gameState?.gameData;
  const initialGameSettings = gameState?.gameSettings;
  
  console.log('[HOST] Initial state from WaitingRoom:', {
    playerNickname,
    isHost,
    gameData: initialGameData,
    gameSettings: initialGameSettings
  });
  
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
  const [gameSettings, setGameSettings] = useState<any>(initialGameSettings || null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 播放背景音樂
  useEffect(() => {
    if (currentGameState.status === 'playing' && !audioRef.current) {
      audioRef.current = playBackgroundMusic();
    }
    
    // 清理音樂
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentGameState.status]);
  
  // 遊戲結束時停止音樂
  useEffect(() => {
    if (currentGameState.status === 'ended' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [currentGameState.status]);

  // Check if user is host, redirect if not
  useEffect(() => {
    if (!isHost) {
      navigate(`/game/${roomId}`, { state: gameState });
      return;
    }
  }, [isHost, navigate, roomId, gameState]);

  // Load game settings from localStorage if not provided from WaitingRoom
  useEffect(() => {
    console.log('[HOST] Checking roomId:', roomId);
    if (roomId && !initialGameSettings) {
      const storedSettings = localStorage.getItem(`game_${roomId}`);
      console.log('[HOST] Loading game settings for room:', roomId);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setGameSettings(settings);
        console.log('[HOST] Loaded game settings from localStorage:', settings);
      }
    } else if (initialGameSettings) {
      console.log('[HOST] Using game settings from WaitingRoom:', initialGameSettings);
    }
  }, [roomId, initialGameSettings]);

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
          console.log('[HOST] Auto-starting game with settings:', gameSettings);
          const startGameMessage = {
            type: 'hostStartGame',
            data: {
              gameType: 'redenvelope',
              duration: gameSettings.duration * 60,
              spawnInterval: 1000,
              envelopeLifetime: 5000,
              envelopeCount: gameSettings.envelopeCount
            }
          };
          
          wsManager.send(startGameMessage);
          // 直接設置遊戲狀態為進行中
          setCurrentGameState(prev => ({ ...prev, status: 'playing', timeLeft: gameSettings.duration * 60 }));
        }

        // Add message handler for this component
        wsManager.addMessageHandler('redEnvelopeHostMonitor', (message: any) => {
          console.log('[HOST] Received message:', message);

          switch (message.type) {
            case 'platformGameStarted':
              console.log('[HOST] Game started:', message);
              setCurrentGameState(prev => ({
                ...prev,
                status: 'playing',
                timeLeft: message.data?.gameData?.timeLeft || 60
              }));
              break;

            case 'timeUpdate':
              console.log('[HOST] Received time update:', message.data?.timeLeft, 'type:', message.type);
              setCurrentGameState(prev => ({
                ...prev,
                timeLeft: message.data?.timeLeft || prev.timeLeft
              }));
              break;

            case 'redEnvelopeGameEnd':
              console.log('[HOST] Game ended:', message);
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

            case 'leaderboard':
              console.log('[HOST] Received leaderboard update:', message);
              if (message.data && Array.isArray(message.data)) {
                const newPlayers = message.data.map((player: any) => ({
                  id: player.nickname,
                  nickname: player.nickname,
                  score: player.score || 0,
                  isConnected: true,
                  isHost: false,
                  avatar: '',
                  collectedCount: player.collectedCount || 0,
                  rank: player.rank || 0
                }));
                setPlayers(newPlayers);
                setCurrentGameState(prev => ({
                  ...prev,
                  totalPlayers: newPlayers.length
                }));
              }
              break;

            case 'playerListUpdate':
              console.log('[HOST] Received player list update:', message);
              if (message.data && message.data.players) {
                const newPlayers = message.data.players.map((player: any) => ({
                  id: player.id || player.nickname,
                  nickname: player.nickname,
                  score: player.score || 0,
                  isConnected: true,
                  isHost: player.isHost || false,
                  avatar: player.avatar,
                  collectedCount: player.collectedCount || 0
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



  const [sortedPlayers, setSortedPlayers] = useState<Player[]>([]);

  // 更新玩家排名 - 只显示非主持人玩家
  useEffect(() => {
    const nonHostPlayers = players.filter(p => !p.isHost);
    const sorted = [...nonHostPlayers].sort((a, b) => b.score - a.score);
    setSortedPlayers(sorted);
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