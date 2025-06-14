import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import WebSocketManager from '../../../utils/WebSocketManager';
import SoundManager from '../../../utils/SoundManager';
import API_CONFIG from '../../../config/api';
import Avatar from '../../../components/Avatar';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Fade,
  Zoom
} from '@mui/material';
import { Timer, People, VolumeUp, VolumeOff, EmojiEvents } from '@mui/icons-material';

interface Player {
  nickname: string;
  score: number;
  matchedPairs: number;
  isConnected: boolean;
  isHost: boolean;
  avatar?: string;
}

interface GameStats {
  totalPairs: number;
  gameTime: number;
  playersCount: number;
}

// 吉卜力風格動物 SVG 組件
const AnimalSVG: React.FC<{ type: string; size?: number; className?: string }> = ({ type, size = 60, className = '' }) => {
  const animals = {
    fox: (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="foxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8C42" />
            <stop offset="100%" stopColor="#FF6B1A" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="60" r="25" fill="url(#foxGradient)" />
        <polygon points="35,45 25,25 45,35" fill="url(#foxGradient)" />
        <polygon points="65,45 75,25 55,35" fill="url(#foxGradient)" />
        <circle cx="42" cy="55" r="3" fill="#2C3E50" />
        <circle cx="58" cy="55" r="3" fill="#2C3E50" />
        <path d="M45 65 Q50 70 55 65" stroke="#2C3E50" strokeWidth="2" fill="none" />
        <circle cx="50" cy="62" r="2" fill="#2C3E50" />
      </svg>
    ),
    rabbit: (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="rabbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8F8FF" />
            <stop offset="100%" stopColor="#E6E6FA" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="65" rx="20" ry="25" fill="url(#rabbitGradient)" />
        <ellipse cx="42" cy="35" rx="6" ry="20" fill="url(#rabbitGradient)" />
        <ellipse cx="58" cy="35" rx="6" ry="20" fill="url(#rabbitGradient)" />
        <circle cx="45" cy="60" r="2" fill="#FF69B4" />
        <circle cx="55" cy="60" r="2" fill="#FF69B4" />
        <circle cx="50" cy="65" r="1.5" fill="#FF69B4" />
        <path d="M47 68 Q50 72 53 68" stroke="#FF69B4" strokeWidth="1.5" fill="none" />
      </svg>
    ),
    bear: (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="bearGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B4513" />
            <stop offset="100%" stopColor="#A0522D" />
          </linearGradient>
        </defs>
        <circle cx="35" cy="40" r="12" fill="url(#bearGradient)" />
        <circle cx="65" cy="40" r="12" fill="url(#bearGradient)" />
        <circle cx="50" cy="60" r="22" fill="url(#bearGradient)" />
        <circle cx="44" cy="55" r="2" fill="#2C3E50" />
        <circle cx="56" cy="55" r="2" fill="#2C3E50" />
        <circle cx="50" cy="62" r="2" fill="#2C3E50" />
        <path d="M46 66 Q50 70 54 66" stroke="#2C3E50" strokeWidth="2" fill="none" />
      </svg>
    ),
    cat: (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="catGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB6C1" />
            <stop offset="100%" stopColor="#FFA0B4" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="60" r="20" fill="url(#catGradient)" />
        <polygon points="38,45 32,30 44,40" fill="url(#catGradient)" />
        <polygon points="62,45 68,30 56,40" fill="url(#catGradient)" />
        <circle cx="44" cy="56" r="2" fill="#2C3E50" />
        <circle cx="56" cy="56" r="2" fill="#2C3E50" />
        <path d="M42 64 Q50 68 58 64" stroke="#2C3E50" strokeWidth="2" fill="none" />
        <circle cx="50" cy="61" r="1.5" fill="#2C3E50" />
      </svg>
    ),
    owl: (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id="owlGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8FBC8F" />
            <stop offset="100%" stopColor="#6B8E23" />
          </linearGradient>
        </defs>
        <ellipse cx="50" cy="55" rx="25" ry="30" fill="url(#owlGradient)" />
        <circle cx="42" cy="48" r="8" fill="#F5F5DC" />
        <circle cx="58" cy="48" r="8" fill="#F5F5DC" />
        <circle cx="42" cy="48" r="4" fill="#2C3E50" />
        <circle cx="58" cy="48" r="4" fill="#2C3E50" />
        <polygon points="50,55 45,62 55,62" fill="#FF8C00" />
      </svg>
    )
  };
  
  return animals[type as keyof typeof animals] || animals.cat;
};

// 啦啦隊動物組件
const CheerleaderAnimals: React.FC = () => {
  const [bounce, setBounce] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setBounce(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      display: 'flex', 
      gap: 1,
      zIndex: 1000
    }}>
      {['rabbit', 'cat', 'fox'].map((animal, index) => (
        <Zoom key={animal} in={true} style={{ transitionDelay: `${index * 200}ms` }}>
          <Box
            sx={{
              transform: bounce ? 'translateY(-10px)' : 'translateY(0px)',
              transition: 'transform 0.5s ease-in-out',
              animation: `cheer-${index} 3s infinite`,
              '@keyframes cheer-0': {
                '0%, 100%': { transform: 'rotate(-5deg) scale(1)' },
                '50%': { transform: 'rotate(5deg) scale(1.1)' }
              },
              '@keyframes cheer-1': {
                '0%, 100%': { transform: 'rotate(3deg) scale(1)' },
                '50%': { transform: 'rotate(-3deg) scale(1.05)' }
              },
              '@keyframes cheer-2': {
                '0%, 100%': { transform: 'rotate(-3deg) scale(1)' },
                '50%': { transform: 'rotate(3deg) scale(1.08)' }
              }
            }}
          >
            <AnimalSVG type={animal} size={50} />
          </Box>
        </Zoom>
      ))}
    </Box>
  );
};

// 競爭動物組件
const CompetingAnimals: React.FC<{ players: Player[] }> = ({ players }) => {
  const nonHostPlayers = players.filter(p => !p.isHost);
  const animalTypes = ['fox', 'bear', 'owl', 'cat', 'rabbit'];
  
  return (
    <Box sx={{ 
      position: 'relative',
      background: 'linear-gradient(135deg, #E8F5E8 0%, #F0F8FF 100%)',
      borderRadius: 3,
      p: 2,
      mb: 3,
      overflow: 'hidden'
    }}>
      {/* 背景裝飾 */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23228B22' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat`
      }} />
      
      <Typography variant="h6" sx={{ 
        textAlign: 'center', 
        mb: 2, 
        color: '#2E7D32',
        fontWeight: 'bold',
        textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
      }}>
        🏆 動物競技場 🏆
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'end', minHeight: 120 }}>
        {nonHostPlayers.slice(0, 5).map((player, index) => {
          const animalType = animalTypes[index % animalTypes.length];
          const isLeader = index === 0;
          const position = index + 1;
          
          return (
            <Fade key={player.nickname} in={true} timeout={1000 + index * 200}>
              <Box sx={{ 
                textAlign: 'center',
                position: 'relative',
                transform: isLeader ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.3s ease'
              }}>
                {/* 排名徽章 */}
                {position <= 3 && (
                  <Box sx={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    zIndex: 2
                  }}>
                    <EmojiEvents sx={{ 
                      color: position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32',
                      fontSize: 24
                    }} />
                  </Box>
                )}
                
                {/* 動物角色 */}
                <Box sx={{
                  position: 'relative',
                  display: 'inline-block',
                  animation: `compete-${index} 4s infinite`,
                  '@keyframes compete-0': {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '25%': { transform: 'translateY(-8px) rotate(-2deg)' },
                    '75%': { transform: 'translateY(-4px) rotate(2deg)' }
                  },
                  '@keyframes compete-1': {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '33%': { transform: 'translateY(-6px) rotate(1deg)' },
                    '66%': { transform: 'translateY(-3px) rotate(-1deg)' }
                  },
                  '@keyframes compete-2': {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '40%': { transform: 'translateY(-5px) rotate(-1.5deg)' },
                    '80%': { transform: 'translateY(-2px) rotate(1.5deg)' }
                  },
                  '@keyframes compete-3': {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '30%': { transform: 'translateY(-4px) rotate(1deg)' },
                    '70%': { transform: 'translateY(-2px) rotate(-1deg)' }
                  },
                  '@keyframes compete-4': {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '35%': { transform: 'translateY(-3px) rotate(-0.5deg)' },
                    '75%': { transform: 'translateY(-1px) rotate(0.5deg)' }
                  }
                }}>
                  <AnimalSVG 
                    type={animalType} 
                    size={isLeader ? 80 : 60}
                    className={isLeader ? 'leader-glow' : ''}
                  />
                  
                  {/* 緊張表情效果 */}
                  {player.score > 0 && (
                    <Box sx={{
                      position: 'absolute',
                      top: '20%',
                      right: '-10px',
                      animation: 'sweat 2s infinite',
                      '@keyframes sweat': {
                        '0%, 100%': { opacity: 0, transform: 'translateY(0px)' },
                        '50%': { opacity: 1, transform: 'translateY(5px)' }
                      }
                    }}>
                      💧
                    </Box>
                  )}
                </Box>
                
                {/* 玩家資訊 */}
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  mt: 1, 
                  fontWeight: 'bold',
                  color: isLeader ? '#1976D2' : '#666'
                }}>
                  {player.nickname}
                </Typography>
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  color: isLeader ? '#1976D2' : '#888',
                  fontSize: '0.7rem'
                }}>
                  {player.score} 分
                </Typography>
                
                {/* 分數條 */}
                <Box sx={{
                  width: 40,
                  height: 4,
                  backgroundColor: '#E0E0E0',
                  borderRadius: 2,
                  mt: 0.5,
                  overflow: 'hidden'
                }}>
                  <Box sx={{
                    width: `${Math.min(100, (player.score / Math.max(...nonHostPlayers.map(p => p.score), 1)) * 100)}%`,
                    height: '100%',
                    backgroundColor: isLeader ? '#4CAF50' : '#2196F3',
                    transition: 'width 0.5s ease',
                    borderRadius: 2
                  }} />
                </Box>
              </Box>
            </Fade>
          );
        })}
      </Box>
    </Box>
  );
};

const HostGameMonitor: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state as any;
  const gameSettings = gameState?.gameSettings;
  const playerNickname = gameState?.playerNickname || 'Host';
  const isHost = gameState?.isHost || false;
  const fromPlatformRoom = gameState?.fromPlatformRoom || false;
  const fromCreateGame = gameState?.fromCreateGame || false;
  const [players, setPlayers] = useState<Player[]>([]);
  const [storedGameSettings, setStoredGameSettings] = useState<any>(null);
  
  // 從 localStorage 讀取遊戲設定
  useEffect(() => {
    if (isHost && roomId) {
      const storedSettings = localStorage.getItem(`game_${roomId}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setStoredGameSettings(settings);
        console.log('[HOST MONITOR] Loaded game settings from localStorage:', settings);
      }
    }
  }, [isHost, roomId]);
  
  const [timeLeft, setTimeLeft] = useState<number>(gameSettings?.gameDuration || 60);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [finalResults, setFinalResults] = useState<any[]>([]);

  const [gameStats, setGameStats] = useState<GameStats>({
    totalPairs: gameSettings?.numPairs || 8,
    gameTime: gameSettings?.gameDuration || 60,
    playersCount: 0
  });
  
  // 當 storedGameSettings 更新時，更新相關狀態
  useEffect(() => {
    if (storedGameSettings) {
      const actualGameDuration = storedGameSettings.duration * 60;
      const actualNumPairs = Math.floor(storedGameSettings.cardCount / 2);
      
      setTimeLeft(actualGameDuration);
      setGameStats(prev => ({
        ...prev,
        totalPairs: actualNumPairs,
        gameTime: actualGameDuration
      }));
      
      console.log('[HOST MONITOR] Updated game stats with stored settings:', {
        duration: actualGameDuration,
        pairs: actualNumPairs
      });
    }
  }, [storedGameSettings]);

  const wsRef = useRef<WebSocket | null>(null);
  const soundManager = SoundManager.getInstance();
  const [previousPlayerCount, setPreviousPlayerCount] = useState<number>(0);
  const [previousScores, setPreviousScores] = useState<Map<string, number>>(new Map());
  const [previousRankings, setPreviousRankings] = useState<string[]>([]);
  const [countdownSoundPlayed, setCountdownSoundPlayed] = useState<Set<number>>(new Set());
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  // 如果不是主持人，重定向到遊戲頁面
  useEffect(() => {
    if (!isHost) {
      navigate(`/game/${roomId}`, { state: gameState });
      return;
    }
  }, [isHost, navigate, roomId, gameState]);

  // 監控頁面載入時自動播放背景音樂
  useEffect(() => {
    if (isHost && roomId) {
      // 延遲一秒播放背景音樂，確保頁面完全載入
      const timer = setTimeout(() => {
        soundManager.playBackgroundMusic();
        setIsMusicPlaying(true);
        console.log('[HOST MONITOR] Background music started automatically');
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isHost, roomId, soundManager]);

  // 音樂控制函數
  const toggleBackgroundMusic = () => {
    if (isMusicPlaying) {
      soundManager.pauseBackgroundMusic();
      setIsMusicPlaying(false);
    } else {
      soundManager.playBackgroundMusic();
      setIsMusicPlaying(true);
    }
  };

  // 處理 WebSocket 接收到的玩家列表更新
  const handlePlayerListUpdate = (data: any) => {
    if (data.players) {
      console.log('[HOST MONITOR] Received player data:', data.players);
      const newPlayers = data.players.map((player: any) => {
        console.log('[HOST MONITOR] Player avatar data:', player.nickname, player.avatar);
        return {
          nickname: player.nickname,
          score: player.score || 0,
          matchedPairs: Math.floor((player.score || 0) / 2),
          isConnected: true,
          isHost: player.isHost || false,
          avatar: player.avatar
        };
      });
      
      // 檢測玩家數量變化
      const currentPlayerCount = newPlayers.filter((p: Player) => !p.isHost).length;
      if (previousPlayerCount > 0 && currentPlayerCount > previousPlayerCount) {
        soundManager.playSound('playerJoin', 0.5);
      } else if (previousPlayerCount > 0 && currentPlayerCount < previousPlayerCount) {
        soundManager.playSound('playerLeave', 0.5);
      }
      setPreviousPlayerCount(currentPlayerCount);
      
      // 檢測分數更新
      newPlayers.forEach((player: Player) => {
        if (!player.isHost) {
          const previousScore = previousScores.get(player.nickname) || 0;
          if (previousScore > 0 && player.score > previousScore) {
            soundManager.playSound('scoreUpdate', 0.4);
          }
          previousScores.set(player.nickname, player.score);
        }
      });
      setPreviousScores(new Map(previousScores));
      
      // 檢測排行榜變化
      const currentRankings = newPlayers
        .filter((p: Player) => !p.isHost)
        .sort((a: Player, b: Player) => b.score - a.score)
        .map((p: Player) => p.nickname);
      
      if (previousRankings.length > 0 && currentRankings.length > 0) {
        // 檢查前三名是否有變化
        const topThreeChanged = currentRankings.slice(0, 3).some((nickname: string, index: number) => 
          previousRankings[index] !== nickname
        );
        
        if (topThreeChanged) {
          soundManager.playSound('rankChange', 0.3);
        }
      }
      setPreviousRankings(currentRankings);
      
      setPlayers(newPlayers);
      setGameStats(prev => ({ ...prev, playersCount: newPlayers.length }));
    }
  };

  // WebSocket 連接並自動開始遊戲
  useEffect(() => {
    if (!roomId || !isHost) return;

    const wsManager = WebSocketManager.getInstance();
    
    const setupConnection = async () => {
      let websocket;
      
      try {
        websocket = wsManager.getConnection();
        if (!websocket) {
          console.log('[HOST MONITOR] No existing connection found, creating new one');
          websocket = await wsManager.connect(roomId, playerNickname, isHost);
        } else {
          console.log('[HOST MONITOR] Using existing platform WebSocket connection');
          }
       
        wsRef.current = websocket;

        // 自動發送開始遊戲訊息
        if (isHost && storedGameSettings) {
          console.log('[HOST MONITOR] Sending start game message with settings:', storedGameSettings);
          const startGameMessage = {
            type: 'hostStartGame',
            payload: {
              gameType: 'memory',
              roomId: roomId,
              numPairs: Math.floor(storedGameSettings.cardCount / 2),
              gameTime: storedGameSettings.duration * 60
            }
          };
          websocket.send(JSON.stringify(startGameMessage));
        }

        // Add message handler for this component
        wsManager.addMessageHandler('hostGameMonitor', (message: any) => {
          console.log('[HOST MONITOR] Received message:', message);

          switch (message.type) {
            case 'gameData':
              console.log('[HOST MONITOR] Received game data:', message);
              const newGameStats = {
                totalPairs: message.cards ? message.cards.length / 2 : 8,
                gameTime: message.gameTime || 60,
                playersCount: gameStats.playersCount
              };
              setGameStats(newGameStats);
              setTimeLeft(message.gameTime || 60);
              // 播放遊戲開始音效和背景音樂
              soundManager.playSound('gameStart', 0.6);
              soundManager.playBackgroundMusic();
              break;

            case 'timeLeft':
              setTimeLeft(message.timeLeft);
              break;

            case 'gameTimeUpdate':
            case 'timeUpdate':
              console.log('[HOST MONITOR] Received time update from server:', message.timeLeft, 'type:', message.type);
              setTimeLeft(message.timeLeft);
              break;

            case 'gameEnded':
              console.log('[HOST MONITOR] Game ended:', message.reason, 'Final results:', message.finalResults);
              setGameEnded(true);
              // 保存最終結果用於顯示前三名
              if (message.finalResults && Array.isArray(message.finalResults)) {
                // 過濾掉主持人
                const playerResults = message.finalResults.filter((player: any) => !player.isHost);
                setFinalResults(playerResults);
              }
              // 播放遊戲結束音效並停止背景音樂
              soundManager.playSound('gameEnd', 0.7);
              soundManager.stopBackgroundMusic();
              break;

            case 'playerListUpdate':
              console.log('[HOST MONITOR] Received player list update:', message);
              handlePlayerListUpdate(message.data);
              break;

            case 'cardsMatched':
              // 當有玩家配對成功時播放音效
              if (message.player !== playerNickname) {
                soundManager.playSound('scoreUpdate', 0.4);
              }
              break;

            case 'platformNotification':
              console.log('[HOST MONITOR] Received platform notification:', message.data);
              // 可以在這裡處理平台通知，例如顯示通知訊息
              break;

            case 'gameGameStarted':
              console.log('[HOST MONITOR] Game started notification:', message);
              // 遊戲開始通知，可以更新 UI 狀態
              if (message.gameData) {
                const newGameStats = {
                  totalPairs: message.gameData.cards ? message.gameData.cards.length / 2 : 8,
                  gameTime: message.gameData.gameTime || 60,
                  playersCount: gameStats.playersCount
                };
                setGameStats(newGameStats);
                setTimeLeft(message.gameData.gameTime || 60);
              }
              break;

            default:
              console.log('[HOST MONITOR] Unknown message type:', message.type);
              break;
          }
        });

      } catch (error) {
        console.error('[HOST MONITOR] Failed to set up WebSocket connection:', error);
        navigate('/error', { state: { message: 'Failed to connect to game server.' } });
      }
    };

    setupConnection();

    return () => {
      soundManager.stopBackgroundMusic();
    };
  }, [roomId, isHost, playerNickname, navigate, gameState, storedGameSettings, fromPlatformRoom, fromCreateGame]);

  // 遊戲計時器
  useEffect(() => {
    if (timeLeft <= 0) {
      setGameEnded(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 監聽遊戲結束狀態
  useEffect(() => {
    if (gameEnded) {
      console.log('[HOST MONITOR] Game ended. Calculating final results...');
      // 過濾掉主持人
      const sortedPlayers = [...players].filter(p => !p.isHost).sort((a, b) => b.score - a.score);
      setFinalResults(sortedPlayers);
      soundManager.stopBackgroundMusic();
      soundManager.playSound('gameEnd');
    }
  }, [gameEnded, players, soundManager]);

  // 監聽玩家數量變化，播放音效
  useEffect(() => {
    if (players.length > previousPlayerCount) {
      soundManager.playSound('playerJoin');
    } else if (players.length < previousPlayerCount) {
      soundManager.playSound('playerLeave');
    }
    setPreviousPlayerCount(players.length);
  }, [players]);

  // 監聽分數變化，播放音效
  useEffect(() => {
    players.forEach(player => {
      const previousScore = previousScores.get(player.nickname) || 0;
      if (player.score > previousScore) {
        soundManager.playSound('scoreUpdate');
      }
    });
    setPreviousScores(new Map(players.map(p => [p.nickname, p.score])));
  }, [players]);

  // 監聽倒計時音效
  useEffect(() => {
    const playCountdownSound = (time: number) => {
      if (!countdownSoundPlayed.has(time)) {
        soundManager.playSound('timeWarning');
        setCountdownSoundPlayed(prev => new Set(prev).add(time));
      }
    };

    if (timeLeft === 10 || timeLeft === 5 || timeLeft === 3 || timeLeft === 2 || timeLeft === 1) {
      playCountdownSound(timeLeft);
    }
  }, [timeLeft, countdownSoundPlayed, soundManager]);

  // 監聽排名變化，播放音效
  useEffect(() => {
    const currentRankings = [...players].sort((a, b) => b.score - a.score).map(p => p.nickname);
    if (previousRankings.length > 0) {
      for (let i = 0; i < currentRankings.length; i++) {
        if (currentRankings[i] !== previousRankings[i]) {
          soundManager.playSound('scoreUpdate');
          break;
        }
      }
    }
    setPreviousRankings(currentRankings);
  }, [players]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPlayerStatus = (isConnected: boolean) => {
    return isConnected ? '在線' : '離線';
  };

  const getPlayerStatusColor = (isConnected: boolean) => {
    return isConnected ? 'success' : 'error';
  };

  // 過濾掉主持人的玩家列表
  const nonHostPlayers = players.filter(player => !player.isHost);

  return (
    <Container maxWidth="lg" sx={{ 
      mt: 4, 
      mb: 4,
      background: 'linear-gradient(135deg, #E8F5E8 0%, #F0F8FF 50%, #FFF8DC 100%)',
      minHeight: '100vh',
      borderRadius: 3,
      position: 'relative'
    }}>
      {/* 全局樣式 */}
      <style>
        {`
          .leader-glow {
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes sparkle {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
        `}
      </style>
      
      {/* 啦啦隊動物 */}
      <CheerleaderAnimals />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{
          background: 'linear-gradient(45deg, #2E7D32, #4CAF50)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
        }}>
          🌟 森林記憶競技場 🌟
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ color: '#2E7D32' }}>
            房間號: {roomId}
          </Typography>
          <IconButton onClick={toggleBackgroundMusic} color="primary" sx={{
            background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(45deg, #388E3C, #689F38)'
            }
          }}>
            {isMusicPlaying ? <VolumeUp /> : <VolumeOff />}
          </IconButton>
        </Box>
      </Box>

      {/* 競爭動物區域 */}
      <CompetingAnimals players={nonHostPlayers} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={6} sx={{ 
            p: 3,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,255,248,0.9) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            border: '2px solid rgba(76, 175, 80, 0.2)'
          }}>
            <Typography variant="h5" gutterBottom sx={{ 
              color: '#2E7D32', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              🏆 競技者排行榜
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2E7D32' }}>排名</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2E7D32' }}>頭像</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2E7D32' }}>暱稱</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2E7D32' }}>分數</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2E7D32' }}>配對成功數</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#2E7D32' }}>狀態</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nonHostPlayers
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => {
                      const rank = index + 1;
                      const isTopThree = rank <= 3;
                      return (
                        <TableRow 
                          key={player.nickname}
                          sx={{
                            backgroundColor: isTopThree ? 
                              rank === 1 ? 'rgba(255, 215, 0, 0.1)' :
                              rank === 2 ? 'rgba(192, 192, 192, 0.1)' :
                              'rgba(205, 127, 50, 0.1)' : 'transparent',
                            '&:hover': {
                              backgroundColor: 'rgba(76, 175, 80, 0.05)'
                            },
                            animation: isTopThree ? 'float 3s ease-in-out infinite' : 'none',
                            animationDelay: `${index * 0.5}s`
                          }}
                        >
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {rank === 1 && '🥇'}
                            {rank === 2 && '🥈'}
                            {rank === 3 && '🥉'}
                            {rank > 3 && rank}
                          </TableCell>
                          <TableCell>
                            <Avatar avatar={player.avatar || 'cat'} size={40} />
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: isTopThree ? 'bold' : 'normal',
                            color: isTopThree ? '#1976D2' : 'inherit'
                          }}>
                            {player.nickname}
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 'bold',
                            color: isTopThree ? '#4CAF50' : 'inherit',
                            fontSize: isTopThree ? '1.1rem' : '1rem'
                          }}>
                            {player.score}
                          </TableCell>
                          <TableCell>{player.matchedPairs}</TableCell>
                          <TableCell>
                            <Chip
                              label={getPlayerStatus(player.isConnected)}
                              color={getPlayerStatusColor(player.isConnected)}
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={6} sx={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,255,248,0.9) 100%)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            border: '2px solid rgba(76, 175, 80, 0.2)'
          }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ 
                color: '#2E7D32', 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                🎮 遊戲狀態
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                <Timer sx={{ mr: 1, color: '#FF5722' }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#FF5722' }}>
                  剩餘時間: {formatTime(timeLeft)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 2 }}>
                <People sx={{ mr: 1, color: '#2196F3' }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#2196F3' }}>
                  競技者: {nonHostPlayers.length}
                </Typography>
              </Box>
              <Box sx={{ p: 1, backgroundColor: 'rgba(156, 39, 176, 0.1)', borderRadius: 2, mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#9C27B0' }}>
                  總配對數: {gameStats.totalPairs}
                </Typography>
              </Box>
              <Box sx={{ p: 1, backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#FF9800' }}>
                  遊戲時長: {gameStats.gameTime / 60} 分鐘
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {gameEnded && (
            <Card elevation={6} sx={{ 
              mt: 3,
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.9) 0%, rgba(255, 193, 7, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              border: '3px solid #FFD700'
            }}>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ 
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: '#B8860B'
                }}>
                  🏆 最終排名 🏆
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', color: '#B8860B' }}>排名</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#B8860B' }}>暱稱</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#B8860B' }}>分數</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {finalResults.map((player, index) => {
                        const rank = index + 1;
                        return (
                          <TableRow key={index} sx={{
                            backgroundColor: rank === 1 ? 'rgba(255, 215, 0, 0.3)' :
                                           rank === 2 ? 'rgba(192, 192, 192, 0.3)' :
                                           rank === 3 ? 'rgba(205, 127, 50, 0.3)' : 'transparent'
                          }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                              {rank === 1 && '🥇'}
                              {rank === 2 && '🥈'}
                              {rank === 3 && '🥉'}
                              {rank > 3 && rank}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{player.nickname}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{player.score}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ 
                    mt: 2,
                    background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #388E3C, #689F38)'
                    }
                  }}
                  onClick={() => navigate(`/games/${roomId}`)}
                >
                  返回主頁
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default HostGameMonitor;