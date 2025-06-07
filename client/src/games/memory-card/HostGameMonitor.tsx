import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import WebSocketManager from '../../utils/WebSocketManager';
import SoundManager from '../../utils/SoundManager';
import API_CONFIG from '../../config/api';
import Avatar from '../../components/Avatar';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton
} from '@mui/material';
import { Timer, People, VolumeUp, VolumeOff } from '@mui/icons-material';

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

const HostGameMonitor: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state as any;
  const gameSettings = gameState?.gameSettings;
  const playerNickname = gameState?.playerNickname || 'Host';
  const isHost = gameState?.isHost || false;
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

  // WebSocket 連接 (僅用於遊戲控制，不接收玩家列表更新)
  useEffect(() => {
    if (!roomId || !isHost) return;

    const wsManager = WebSocketManager.getInstance();
    
    // Connect or reuse existing connection
    wsManager.connect(roomId, playerNickname, isHost)
      .then((websocket) => {
        console.log('[HOST MONITOR] WebSocket connection established');
        wsRef.current = websocket;
        
        // Add message handler for this component
        wsManager.addMessageHandler('hostGameMonitor', (message) => {
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
              
            case 'timeUpdate':
              console.log('[HOST MONITOR] Received time update from server:', message.timeLeft);
              setTimeLeft(message.timeLeft);
              break;

            case 'gameEnded':
              console.log('[HOST MONITOR] Game ended:', message.reason);
              setGameEnded(true);
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

            default:
              console.log('[HOST MONITOR] Unknown message type:', message.type);
          }
        });
      })
      .catch((error) => {
        console.error('[HOST MONITOR] WebSocket connection error:', error);
      });

    // Cleanup function - remove message handler but don't disconnect during game
    return () => {
      const wsManager = WebSocketManager.getInstance();
      wsManager.removeMessageHandler('hostGameMonitor');
      
      // 停止背景音樂
      soundManager.stopBackgroundMusic();
      
      // Don't disconnect during game - let WebSocketManager handle this
      console.log('[HOST MONITOR] Component unmounting, message handler removed');
    };
  }, [roomId, isHost, playerNickname, gameStats.playersCount]);

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
          soundManager.playSound('scoreUpdate', 0.6);
        }
      }
      setPreviousRankings(currentRankings);
      
      setPlayers(newPlayers);
      setGameStats(prev => ({
        ...prev,
        playersCount: data.players.length
      }));
    }
  };

  // 初始載入玩家資料（僅執行一次）
  useEffect(() => {
    if (!roomId || !isHost) return;

    const fetchInitialPlayerData = async () => {
      try {
        const response = await fetch(API_CONFIG.ENDPOINTS.ROOM_PLAYERS(roomId));
        if (response.ok) {
          const data = await response.json();
          console.log('[HOST MONITOR] Initial player data loaded:', data);
          handlePlayerListUpdate(data);
          
          if (data.gameEnded !== undefined) {
            setGameEnded(data.gameEnded);
          }
        } else {
          console.error('[HOST MONITOR] Failed to fetch initial player data:', response.status);
        }
      } catch (error) {
        console.error('[HOST MONITOR] Error fetching initial player data:', error);
      }
    };

    // 只在組件載入時執行一次
    fetchInitialPlayerData();
  }, [roomId, isHost]); // 移除其他依賴，避免重複執行

  // 處理時間相關音效（由服務端時間更新觸發）
  useEffect(() => {
    if (gameEnded || timeLeft <= 0) return;

    // 倒數時間音效
    if (timeLeft === 30 && !countdownSoundPlayed.has(30)) {
      soundManager.playSound('timeWarning', 0.4);
      setCountdownSoundPlayed(new Set(Array.from(countdownSoundPlayed).concat([30])));
    } else if (timeLeft === 10 && !countdownSoundPlayed.has(10)) {
      soundManager.playSound('timeWarning', 0.6);
      setCountdownSoundPlayed(new Set(Array.from(countdownSoundPlayed).concat([10])));
    } else if (timeLeft === 5 && !countdownSoundPlayed.has(5)) {
      // 最後5秒倒數音效
      soundManager.playSound('timeWarning', 0.8);
      setCountdownSoundPlayed(new Set(Array.from(countdownSoundPlayed).concat([5])));
    } else if (timeLeft <= 4 && timeLeft > 0 && !countdownSoundPlayed.has(timeLeft)) {
      // 每秒倒數音效
      soundManager.playSound('scoreUpdate', 0.7);
      setCountdownSoundPlayed(new Set(Array.from(countdownSoundPlayed).concat([timeLeft])));
    }
  }, [timeLeft, gameEnded, countdownSoundPlayed, soundManager]);

  // 格式化時間顯示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



  // 排序玩家（按分數降序）
  const sortedPlayers = [...players].filter(player => !player.isHost).sort((a, b) => b.score - a.score);

  // 結束遊戲並返回房間
  const endGameAndReturn = () => {
    // 停止背景音樂
    soundManager.stopBackgroundMusic();
    
    // Send close game message to server
    const wsManager = WebSocketManager.getInstance();
    wsManager.send({ type: 'hostCloseGame' });
    console.log('[HOST MONITOR] Sent hostCloseGame message to server');
    
    // Force disconnect all connections when game ends
    wsManager.forceDisconnect();
    
    navigate(`/gameroom/${roomId}`, {
      state: {
        playerNickname,
        isHost: true
      }
    });
  };

  // 移除等待遊戲數據的載入狀態檢查
  if (!isHost) {
    return null; // 防止閃爍
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold',
            color: 'primary.main'
          }}
        >
          🎮 遊戲監控台 - 房間 {roomId}
        </Typography>
        
        <IconButton 
          onClick={toggleBackgroundMusic}
          color="primary"
          size="large"
          sx={{ 
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.2)'
            }
          }}
        >
          {isMusicPlaying ? <VolumeUp /> : <VolumeOff />}
        </IconButton>
      </Box>

      {/* 遊戲狀態 */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
          {gameEnded && (
            <Chip 
              label="遊戲結束" 
              color="error" 
              size="medium" 
              sx={{ fontSize: '1.2rem', py: 2 }}
            />
          )}
          <IconButton
            onClick={() => soundManager.setMuted(!soundManager.isSoundMuted())}
            color={soundManager.isSoundMuted() ? 'default' : 'primary'}
            title={soundManager.isSoundMuted() ? '開啟音效' : '關閉音效'}
          >
            {soundManager.isSoundMuted() ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
          <IconButton
            onClick={() => soundManager.setMusicMuted(!soundManager.isMusicSoundMuted())}
            color={soundManager.isMusicSoundMuted() ? 'default' : 'secondary'}
            title={soundManager.isMusicSoundMuted() ? '開啟背景音樂' : '關閉背景音樂'}
          >
            {soundManager.isMusicSoundMuted() ? '🎵' : '🎶'}
          </IconButton>
        </Box>
      </Box>

      {/* 主要內容區域 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 左側：遊戲統計 */}
        <Grid item xs={12} md={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Timer sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" component="div">
                    {formatTime(timeLeft)}
                  </Typography>
                  <Typography color="text.secondary">
                    剩餘時間
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <People sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" component="div">
                    {sortedPlayers.length}
                  </Typography>
                  <Typography color="text.secondary">
                    參與玩家
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        
        {/* 右側：即時排行榜 */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" component="h2">
                🏆 即時排行榜
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>排名</strong></TableCell>
                    <TableCell><strong>玩家</strong></TableCell>
                    <TableCell align="center"><strong>分數</strong></TableCell>
                    <TableCell align="center"><strong>狀態</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPlayers.length > 0 ? (
                    sortedPlayers.map((player, index) => (
                      <TableRow 
                        key={player.nickname}
                        sx={{ 
                          backgroundColor: index === 0 ? 'gold' : 
                                         index === 1 ? 'silver' : 
                                         index === 2 ? '#CD7F32' : 'inherit',
                          opacity: player.isConnected ? 1 : 0.6
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {index === 0 && '🥇'}
                            {index === 1 && '🥈'}
                            {index === 2 && '🥉'}
                            {index > 2 && `#${index + 1}`}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar avatar={player.avatar || 'cat'} size={32} />
                            <Typography variant="body2" fontWeight={index < 3 ? 'bold' : 'normal'}>
                              {player.nickname}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" color="primary" fontWeight="bold">
                            {player.score}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={player.isConnected ? '在線' : '離線'} 
                            color={player.isConnected ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary" variant="body2">
                          等待玩家加入...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* 遊戲結束後的操作按鈕 */}
      {gameEnded && (
        <Box sx={{ textAlign: 'center' }}>
          <Button 
            variant="contained" 
            size="large" 
            onClick={endGameAndReturn}
            sx={{ px: 4, py: 2 }}
          >
            返回遊戲房間
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default HostGameMonitor;