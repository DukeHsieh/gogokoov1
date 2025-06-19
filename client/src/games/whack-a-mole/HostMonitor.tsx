import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Paper,
  LinearProgress,
  Avatar,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Timer,
  EmojiEvents,
  Stop,
  People,
} from '@mui/icons-material';
import WebSocketManager from '../../utils/WebSocketManager';
import SoundManager from '../../utils/SoundManager';

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
}));

const MonitorCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  marginBottom: theme.spacing(2),
}));

const TimerCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 16,
  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
  color: 'white',
  textAlign: 'center',
  marginBottom: theme.spacing(2),
}));

const RankingItem = styled(ListItem)<{ rank: number }>(({ theme, rank }) => ({
  borderRadius: 12,
  marginBottom: theme.spacing(1),
  background: rank === 1 ? 'linear-gradient(45deg, #FFD700 30%, #FFA500 90%)' :
             rank === 2 ? 'linear-gradient(45deg, #C0C0C0 30%, #A9A9A9 90%)' :
             rank === 3 ? 'linear-gradient(45deg, #CD7F32 30%, #B8860B 90%)' :
             'rgba(255, 255, 255, 0.8)',
  color: rank <= 3 ? 'white' : 'inherit',
  boxShadow: rank <= 3 ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
}));

interface Player {
  id: string;
  nickname: string;
  score: number;
  avatar: string;
}

interface GameState {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  players: Player[];
}

const WhackAMoleHostMonitor: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    timeLeft: 0,
    totalTime: 60,
    isActive: false,
    players: [],
  });
  const [showGameOver, setShowGameOver] = useState(false);

  // 處理 WebSocket 消息
  const handleWebSocketMessage = (message: any) => {
    //console.log('[HostMonitor] Received message:', message);
    
    switch (message.type) {
        case 'mole-startgame':
          setGameState(prev => ({
            ...prev,
            isActive: true,
            totalTime: message.data.gameSettings?.duration || 60,
            timeLeft: message.data.gameSettings?.duration || 60,
          }));
          // 播放遊戲開始音效
          soundManagerRef.current?.playSound('gameStart');
          break;
          
        case 'mole-timeupdate':
          // console.log('[HostMonitor] Time update:', message.timeLeft);
          setGameState(prev => ({
            ...prev,
            timeLeft: message.timeLeft ?? prev.timeLeft,
          }));
          // 時間警告音效（最後10秒）
          if (message.timeLeft <= 10 && message.timeLeft > 0) {
            soundManagerRef.current?.playSound('timeWarning');
          }
          break;
          
        // case 'mole-scoreupdate':
        //   // The server now sends a map of PlayerScore objects
        //   // We need to convert this map to an array for the HostMonitor state
        //   const playersMap = message.data?.players as Record<string, Player>;
        //   if (playersMap) {
        //     const playersArray = Object.values(playersMap).map(p => ({ ...p, id: p.id || '' })); // Ensure id is present
        //     setGameState(prev => ({
        //       ...prev,
        //       players: playersArray,
        //     }));
        //   } else {
        //     setGameState(prev => ({
        //       ...prev,
        //       players: message.data?.players || [], // Fallback for old format, though server should send map
        //     }));
        //   }
        //   // 播放分數更新音效
        //   soundManagerRef.current?.playSound('scoreUpdate');
        //   break;
          
        case 'mole-leaderboard':
          if (message.players) {
            const playersMap = message.players as Record<string, any>;
            const playersArray = Object.values(playersMap).map((p: any) => ({
              id: p.nickname || '',
              nickname: p.nickname || '',
              score: p.score || 0,
              avatar: p.avatar || '',
            }));
            setGameState(prev => ({
              ...prev,
              players: playersArray,
            }));
          }
          break;
          
        case 'mole-gameend':
          setGameState(prev => ({
            ...prev,
            isActive: false,
            timeLeft: 0,
          }));
          setShowGameOver(true);
          // 播放遊戲結束音效
          soundManagerRef.current?.playSound('gameEnd');
          break;
    }
  };

  // 組件初始化時使用 platform 建立好的連接
  useEffect(() => {
    if (!roomId) {
      console.error('Missing roomId');
      return;
    }

    const wsManager = WebSocketManager.getInstance();
    wsManagerRef.current = wsManager;
    
    // 初始化音效管理器
    const soundManager = SoundManager.getInstance();
    soundManagerRef.current = soundManager;
    
    // 播放背景音樂 - 使用 mole_leaderboard.wav
    soundManager.playBackgroundMusic('/assets/sounds/mole_leaderboard.wav');
    
    // 添加消息處理器
    wsManager.addMessageHandler('whackAMoleHost', (message: any) => {
      //console.log('[WhackAMoleHost] Received message:', message);
      handleWebSocketMessage(message);
    });

    return () => {
      // 清理消息處理器
      //wsManager.removeMessageHandler('whackAMoleHost');
      // 停止背景音樂
      soundManager.stopBackgroundMusic();
    };
  }, [roomId]);

  const handleStopGame = () => {
    if (wsManagerRef.current) {
      wsManagerRef.current.send({
        type: 'hostStopGame',
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressValue = () => {
    if (gameState.totalTime === 0 || gameState.timeLeft === undefined || gameState.timeLeft === null) return 0;
    return ((gameState.totalTime - gameState.timeLeft) / gameState.totalTime) * 100;
  };

  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  if (showGameOver) {
    return (
      <StyledContainer>
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Typography variant="h2" fontWeight="bold" mb={2}>
            🎮 遊戲結束
          </Typography>
          <Typography variant="h4" mb={4}>
            最終排行榜
          </Typography>
          {sortedPlayers.length > 0 && (
            <Box sx={{ mb: 4 }}>
              {sortedPlayers.slice(0, 3).map((player, index) => (
                <Typography key={player.id} variant="h5" mb={1}>
                   {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {player.nickname}: {player.score}分
                 </Typography>
              ))}
            </Box>
          )}
          <Typography variant="h6" mb={4}>
            感謝所有玩家的參與！
          </Typography>
        </Box>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      {/* 標題 */}
      <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
        <EmojiEvents sx={{ fontSize: 32, color: 'white', mr: 2 }} />
        <Typography variant="h4" fontWeight="bold" color="white">
          打地鼠遊戲監控
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* 時間顯示 */}
        <Grid item xs={12} md={6}>
          <TimerCard>
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
              <Timer sx={{ fontSize: 28, mr: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                剩餘時間
              </Typography>
            </Box>
            <Typography variant="h2" fontWeight="bold" mb={2}>
              {formatTime(gameState.timeLeft)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={getProgressValue()}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white',
                },
              }}
            />
          </TimerCard>
        </Grid>

        {/* 遊戲狀態 */}
        <Grid item xs={12} md={6}>
          <MonitorCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <EmojiEvents sx={{ color: '#667eea', mr: 1 }} />
                <Typography variant="h6" fontWeight="600">
                  遊戲狀態
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      遊戲狀態
                    </Typography>
                    <Chip 
                      label={gameState.isActive ? '進行中' : '等待開始'}
                      color={gameState.isActive ? 'success' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      參與玩家
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {gameState.players.length}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {gameState.isActive && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Stop />}
                  onClick={handleStopGame}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  結束遊戲
                </Button>
              )}
            </CardContent>
          </MonitorCard>
        </Grid>

        {/* 排行榜 */}
        <Grid item xs={12}>
          <MonitorCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <EmojiEvents sx={{ color: '#667eea', mr: 1 }} />
                <Typography variant="h6" fontWeight="600">
                  即時排行榜
                </Typography>
              </Box>
              
              {sortedPlayers.length === 0 ? (
                <Typography variant="body1" color="textSecondary" textAlign="center">
                  等待玩家加入...
                </Typography>
              ) : (
                <List sx={{ p: 0 }}>
                  {sortedPlayers.map((player, index) => {
                    const rank = index + 1;
                    return (
                      <RankingItem key={player.id} rank={rank}>
                        <Box display="flex" alignItems="center" width="100%">
                          <Box display="flex" alignItems="center" mr={2}>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              sx={{ minWidth: 30 }}
                            >
                              #{rank}
                            </Typography>
                          </Box>
                          
                          <Avatar
                            src={player.avatar}
                            sx={{ width: 40, height: 40, mr: 2 }}
                          >
                            {player.nickname.charAt(0)}
                          </Avatar>
                          
                          <ListItemText
                            primary={
                              <Typography variant="h6" fontWeight="600">
                                {player.nickname}
                              </Typography>
                            }
                            sx={{ flex: 1 }}
                          />
                          
                          <Chip
                            label={`${player.score} 分`}
                            sx={{
                              backgroundColor: rank <= 3 ? 'rgba(255,255,255,0.3)' : '#667eea',
                              color: rank <= 3 ? 'white' : 'white',
                              fontWeight: 'bold',
                              fontSize: '1rem',
                            }}
                          />
                        </Box>
                      </RankingItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </MonitorCard>
        </Grid>
      </Grid>
    </StyledContainer>
  );
};

export default WhackAMoleHostMonitor;