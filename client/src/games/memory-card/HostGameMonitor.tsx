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
  const fromPlatformRoom = gameState?.fromPlatformRoom || false; // 是否來自platform房間
  const fromCreateGame = gameState?.fromCreateGame || false; // 是否來自創建遊戲頁面
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
        // 使用已建立的platform連接
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

            case 'timeUpdate':
              console.log('[HOST MONITOR] Received time update from server:', message.timeLeft);
              setTimeLeft(message.timeLeft);
              break;

            case 'gameEnded':
              console.log('[HOST MONITOR] Game ended:', message.reason, 'Final results:', message.finalResults);
              setGameEnded(true);
              // 保存最終結果用於顯示前三名
              if (message.finalResults && Array.isArray(message.finalResults)) {
                setFinalResults(message.finalResults);
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

            case 'gameStarted':
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
      //const wsManager = WebSocketManager.getInstance();
      //wsManager.removeMessageHandler('hostGameMonitor');
      
    // 停止背景音樂
      soundManager.stopBackgroundMusic();
      
      //console.log('[HOST MONITOR] Cleaning up WebSocket connection');
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
      // 根據分數計算最終排名
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          遊戲監控 - 房間號: {roomId}
        </Typography>
        <IconButton onClick={toggleBackgroundMusic} color="primary">
          {isMusicPlaying ? <VolumeUp /> : <VolumeOff />}
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>玩家列表</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>頭像</TableCell>
                    <TableCell>暱稱</TableCell>
                    <TableCell>分數</TableCell>
                    <TableCell>配對成功數</TableCell>
                    <TableCell>狀態</TableCell>
                    <TableCell>角色</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {players.map((player, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Avatar avatar={player.avatar || 'cat'} size={40} />
                      </TableCell>
                      <TableCell>{player.nickname}</TableCell>
                      <TableCell>{player.score}</TableCell>
                      <TableCell>{player.matchedPairs}</TableCell>
                      <TableCell>
                        <Chip
                          label={getPlayerStatus(player.isConnected)}
                          color={getPlayerStatusColor(player.isConnected)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{player.isHost ? '主持人' : '玩家'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h5" gutterBottom>遊戲狀態</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Timer sx={{ mr: 1 }} />
                <Typography variant="body1">剩餘時間: {formatTime(timeLeft)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People sx={{ mr: 1 }} />
                <Typography variant="body1">當前玩家: {players.length} / {gameStats.playersCount}</Typography>
              </Box>
              <Typography variant="body1">總配對數: {gameStats.totalPairs}</Typography>
              <Typography variant="body1">遊戲時長: {gameStats.gameTime / 60} 分鐘</Typography>
            </CardContent>
          </Card>

          {gameEnded && (
            <Card elevation={3} sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>遊戲結果</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>排名</TableCell>
                        <TableCell>暱稱</TableCell>
                        <TableCell>分數</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {finalResults.map((player, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{player.nickname}</TableCell>
                          <TableCell>{player.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/')}
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