import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItemText,
  Avatar,
  Chip,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { EmojiEvents } from '@mui/icons-material';
import WebSocketManager from '../../utils/WebSocketManager';
import SoundManager from '../../utils/SoundManager';

// 動畫定義
const moleAppear = keyframes`
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;

const moleDisappear = keyframes`
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(100%);
    opacity: 0;
  }
`;

const hitEffect = keyframes`
  0% {
    transform: scale(1);
    background-color: #4caf50;
  }
  50% {
    transform: scale(1.2);
    background-color: #8bc34a;
  }
  100% {
    transform: scale(1);
    background-color: #4caf50;
  }
`;

// 樣式組件
const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
}));

const GameBoard = styled(Box)(({ theme }) => ({
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 20,
  padding: theme.spacing(3),
  backdropFilter: 'blur(10px)',
  border: '2px solid rgba(255,255,255,0.2)',
}));

const MoleHole = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive' && prop !== 'isHit',
})<{ isActive: boolean; isHit: boolean }>(({ theme, isActive, isHit }) => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: isHit 
    ? 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)'
    : 'linear-gradient(135deg, #8d6e63 0%, #5d4037 100%)',
  border: '4px solid #3e2723',
  position: 'relative',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  animation: isHit ? `${hitEffect} 0.3s ease` : 'none',
  '&:hover': {
    transform: 'scale(1.05)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
  [theme.breakpoints.down('sm')]: {
    width: 60,
    height: 60,
  },
}));

const Mole = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible',
})<{ isVisible: boolean }>(({ theme, isVisible }) => ({
  width: '70%',
  height: '70%',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: isVisible 
    ? `${moleAppear} 0.3s ease-out`
    : `${moleDisappear} 0.3s ease-in`,
}));

// 地鼠 SVG 組件
const MoleSVG: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    style={{ maxWidth: '60px', maxHeight: '60px' }}
  >
    {/* 地鼠身體 */}
    <ellipse cx="50" cy="70" rx="25" ry="20" fill="#8d6e63" />
    {/* 地鼠頭部 */}
    <circle cx="50" cy="45" r="20" fill="#a1887f" />
    {/* 地鼠耳朵 */}
    <ellipse cx="40" cy="30" rx="6" ry="8" fill="#8d6e63" />
    <ellipse cx="60" cy="30" rx="6" ry="8" fill="#8d6e63" />
    <ellipse cx="40" cy="32" rx="3" ry="4" fill="#ffb74d" />
    <ellipse cx="60" cy="32" rx="3" ry="4" fill="#ffb74d" />
    {/* 地鼠眼睛 */}
    <circle cx="44" cy="42" r="3" fill="#000" />
    <circle cx="56" cy="42" r="3" fill="#000" />
    <circle cx="45" cy="41" r="1" fill="#fff" />
    <circle cx="57" cy="41" r="1" fill="#fff" />
    {/* 地鼠鼻子 */}
    <ellipse cx="50" cy="48" rx="2" ry="1.5" fill="#000" />
    {/* 地鼠嘴巴 */}
    <path d="M 47 52 Q 50 54 53 52" stroke="#000" strokeWidth="1" fill="none" />
    {/* 地鼠鬍鬚 */}
    <line x1="35" y1="46" x2="42" y2="47" stroke="#000" strokeWidth="1" />
    <line x1="35" y1="50" x2="42" y2="50" stroke="#000" strokeWidth="1" />
    <line x1="58" y1="47" x2="65" y2="46" stroke="#000" strokeWidth="1" />
    <line x1="58" y1="50" x2="65" y2="50" stroke="#000" strokeWidth="1" />
  </svg>
);

const ScoreCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
}));

const TimerCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(45deg, #ff6b6b 30%, #ee5a24 90%)',
  color: 'white',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
}));

const LeaderboardCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  marginTop: theme.spacing(2),
}));

const RankingItem = styled(Box)<{ rank: number }>(({ theme, rank }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  borderRadius: 12,
  background: rank <= 3 
    ? `linear-gradient(45deg, ${rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32'} 30%, ${rank === 1 ? '#ffed4e' : rank === 2 ? '#e8e8e8' : '#daa520'} 90%)`
    : 'rgba(103, 126, 234, 0.1)',
  border: rank <= 3 ? 'none' : '1px solid rgba(103, 126, 234, 0.2)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
}));

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface Player {
  id: string;
  nickname: string;
  score: number;
  avatar?: string;
}

interface GameSettings {
  duration: number;
  spawnInterval: number;
  moleLifetime: number;
  gridSize: number;
}

interface Mole {
  id: number;
  position: number;
  isVisible: boolean;
  timeLeft: number;
}

interface GameState {
  isActive: boolean;
  timeLeft: number;
  totalTime: number;
  score: number;
  players: Player[];
  moles: Mole[];
  settings: GameSettings;
}

interface MoleHoleState {
  id: number;
  isActive: boolean;
  isHit: boolean;
  moleId?: string; // Add moleId to track which mole is in which hole
}

const WhackAMoleGame: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);

  // 狀態管理
  const [gameState, setGameState] = useState<GameState>({
    isActive: false,
    timeLeft: 0,
    totalTime: 60,
    score: 0,
    players: [],
    moles: [],
    settings: {
      duration: 60,
      spawnInterval: 2,
      moleLifetime: 3,
      gridSize: 9,
    },
  });

  // 地鼠洞穴狀態（3x3 網格）
  const [moleHoles, setMoleHoles] = useState<MoleHoleState[]>(
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      isActive: false,
      isHit: false,
    }))
  );

  const [isWaitingForGame, setIsWaitingForGame] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const moleTimersRef = useRef<Record<number, NodeJS.Timeout>>({}); // Ref to store mole timers

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
    wsManager.addMessageHandler('whackAMoleGame', (message: any) => {
      //console.log('[WhackAMoleGame] Received message:', message);
      handleWebSocketMessage(message);
    });

    setGameState(prev => ({
      ...prev,
      isActive: true,
      //timeLeft: message.data?.gameSettings?.duration || 60,
      //totalTime: message.data?.gameSettings?.duration || 60,
      //settings: message.data?.gameSettings || prev.settings,
      moles: [],
      score: 0,
    }));
    
    setIsWaitingForGame(false);
    setShowGameOver(false);

    return () => {
      // 清理消息處理器
      //wsManager.removeMessageHandler('whackAMoleGame');
      // Clear all mole timers when component unmounts or game ends
      Object.values(moleTimersRef.current).forEach(clearTimeout);
      moleTimersRef.current = {};
      // 停止背景音樂
      soundManager.stopBackgroundMusic();
    };
  }, [roomId]);

  // Mole spawning and hiding logic (client-side)
  const spawnMole = useCallback(() => {
    if (!gameState.isActive) return;

    setMoleHoles(prevHoles => {
      const availableHoles = prevHoles.filter(h => !h.isActive);
      if (availableHoles.length === 0) return prevHoles;

      const randomIndex = Math.floor(Math.random() * availableHoles.length);
      const holeToSpawn = availableHoles[randomIndex];

      // Clear existing timer for this hole if any (should not happen with correct logic)
      if (moleTimersRef.current[holeToSpawn.id]) {
        clearTimeout(moleTimersRef.current[holeToSpawn.id]);
      }

      // Set timer for mole to disappear
      moleTimersRef.current[holeToSpawn.id] = setTimeout(() => {
        hideMole(holeToSpawn.id);
      }, gameState.settings.moleLifetime * 1000);

      return prevHoles.map(h => 
        h.id === holeToSpawn.id ? { ...h, isActive: true, isHit: false, moleId: `mole_${h.id}_${Date.now()}` } : h
      );
    });
  }, [gameState.isActive, gameState.settings.moleLifetime]);

  const hideMole = useCallback((holeId: number) => {
    setMoleHoles(prevHoles => 
      prevHoles.map(h => 
        h.id === holeId ? { ...h, isActive: false, isHit: false, moleId: undefined } : h
      )
    );
    // Clear the timer for this mole
    if (moleTimersRef.current[holeId]) {
      clearTimeout(moleTimersRef.current[holeId]);
      delete moleTimersRef.current[holeId];
    }
  }, []);

  // Effect for mole spawning interval
  useEffect(() => {
    let spawnIntervalId: NodeJS.Timeout;
    if (gameState.isActive) {
      spawnIntervalId = setInterval(() => {
        spawnMole();
      },  500); //gameState.settings.spawnInterval * 1000);
    }
    return () => {
      clearInterval(spawnIntervalId);
      // Clear all mole timers when game ends or isActive changes
      Object.values(moleTimersRef.current).forEach(clearTimeout);
      moleTimersRef.current = {};
    };
  }, [gameState.isActive, gameState.settings.spawnInterval, spawnMole]);


  // 處理 WebSocket 消息
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'mole-startgame':
        setGameState(prev => ({
          ...prev,
          isActive: true,
          timeLeft: message.data?.gameSettings?.duration || 60,
          totalTime: message.data?.gameSettings?.duration || 60,
          settings: message.data?.gameSettings || prev.settings,
        }));
        setIsWaitingForGame(false);
        setShowGameOver(false);
        // 播放遊戲開始音效
        soundManagerRef.current?.playSound('gameStart');
        break;
        
      case 'mole-gameend':
        setGameState(prev => ({
          ...prev,
          isActive: false,
          timeLeft: 0,
          moles: [],
        }));
        // Update leaderboard with final rankings from server
        if (message.players && Array.isArray(message.players)) {
          setGameState(prev => ({
            ...prev,
            players: message.players.map((player: any) => ({
              id: player.nickname,
              nickname: player.nickname,
              score: player.score,
              avatar: `/assets/avatars/avatar${Math.floor(Math.random() * 10) + 1}.png`
            }))
          }));
        }
        setShowGameOver(true);
        // 播放遊戲結束音效
        soundManagerRef.current?.playSound('gameEnd');
        break;
        
      case 'mole-timeupdate':
        // console.log('[WhackAMoleGame] Time update:', message.timeLeft);
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
      //   // Check if the score update is for the current player
      //   if (message.data?.playerId === (wsManagerRef.current as any)?.gameState?.playerNickname) {
      //     setGameState(prev => ({
      //       ...prev,
      //       score: message.data?.score ?? prev.score,
      //     }));
      //   }
      //   break;
        
    }
  };

  // 擊打地鼠
  const handleMoleHit = useCallback((holeId: number) => {
    if (!gameState.isActive) return;
    
    const hole = moleHoles.find(h => h.id === holeId);
    if (!hole || !hole.isActive || hole.isHit) return;

    // 播放擊中音效
    soundManagerRef.current?.playSound('match');

    // 本地立即反饋
    setMoleHoles(prev => 
      prev.map(h => 
        h.id === holeId ? { ...h, isHit: true } : h
      )
    );

    // 客户端决定得分：击中地鼠得10分
    const scoreGained = 10;
    const newScore = gameState.score + scoreGained;
    setGameState(prev => ({
      ...prev,
      score: newScore,
    }));

    // 發送 scoreupdate 訊息到服務器，包含 player 的總分
    if (wsManagerRef.current) {
      wsManagerRef.current.send({
        type: 'mole-scoreupdate',
        data: {
          totalScore: newScore, // player 自己的總分
        },
      });
    }

    // isHit 狀態和地鼠消失將由 hideMole 通過計時器處理
  }, [gameState.isActive, moleHoles, hideMole]);



  // 計算網格大小
  const getGridColumns = () => {
    return Math.sqrt(gameState.settings.gridSize);
  };

  if (isWaitingForGame) {
    return (
      <StyledContainer>
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Typography variant="h4" fontWeight="bold" mb={2}>
            🔨 打地鼠遊戲
          </Typography>
          <Typography variant="h6" mb={4}>
            等待主持人開始遊戲...
          </Typography>
        </Box>
      </StyledContainer>
    );
  }

  // 計算排序後的玩家列表
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  if (showGameOver) {
    return (
      <StyledContainer maxWidth="lg">
        <Box sx={{ textAlign: 'center', color: 'white', mb: 3 }}>
          <Typography variant="h2" fontWeight="bold" mb={2}>
            🎮 遊戲結束
          </Typography>
          <Typography variant="h4" mb={2}>
            最終得分：{gameState.score}
          </Typography>
          <Typography variant="h6" mb={4}>
            感謝您的參與！
          </Typography>
        </Box>
        
        {/* 最終排行榜 */}
        <LeaderboardCard>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <EmojiEvents sx={{ color: '#667eea', mr: 1 }} />
              <Typography variant="h6" fontWeight="600">
                最終排行榜
              </Typography>
            </Box>
            
            {sortedPlayers.length === 0 ? (
              <Typography variant="body1" color="textSecondary" textAlign="center">
                暫無排行資料
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
        </LeaderboardCard>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer maxWidth="lg">
      {/* 標題區域 */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography
          variant="h4"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            mb: 1,
          }}
        >
          🔨 打地鼠大作戰
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          房間號：{roomId}
        </Typography>
      </Box>

      {/* 遊戲倒數計時和得分 - 水平排列 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
        <TimerCard sx={{ minWidth: 200, flex: '1 1 auto', maxWidth: 300 }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" gutterBottom>
              ⏰ 剩餘時間
            </Typography>
            <Typography variant="h2" fontWeight="bold">
              {formatTime(gameState.timeLeft)}
            </Typography>
          </CardContent>
        </TimerCard>
        
        <ScoreCard sx={{ minWidth: 200, flex: '1 1 auto', maxWidth: 300 }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              我的得分
            </Typography>
            <Typography variant="h3" fontWeight="bold">
              {gameState.score}
            </Typography>
          </CardContent>
        </ScoreCard>
      </Box>

      {/* 遊戲區域 */}
      <GameBoard>
        <Grid container spacing={2} justifyContent="center">
          {moleHoles.map((hole) => (
            <Grid item key={hole.id} xs={4} sm={4} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <MoleHole
                  isActive={hole.isActive}
                  isHit={hole.isHit}
                  onClick={() => handleMoleHit(hole.id)}
                >
                  {hole.isActive && (
                    <Mole isVisible={hole.isActive && !hole.isHit}>
                      <MoleSVG />
                    </Mole>
                  )}
                </MoleHole>
              </Box>
            </Grid>
          ))}
        </Grid>
      </GameBoard>

      {/* 即時排行榜 */}
      {sortedPlayers.length > 0 && (
        <LeaderboardCard>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <EmojiEvents sx={{ color: '#667eea', mr: 1 }} />
              <Typography variant="h6" fontWeight="600">
                即時排行榜
              </Typography>
            </Box>
            
            <List sx={{ p: 0 }}>
              {sortedPlayers.slice(0, 5).map((player, index) => {
                const rank = index + 1;
                return (
                  <RankingItem key={player.id} rank={rank}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Box display="flex" alignItems="center" mr={2}>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          sx={{ minWidth: 25 }}
                        >
                          #{rank}
                        </Typography>
                      </Box>
                      
                      <Avatar
                        src={player.avatar}
                        sx={{ width: 32, height: 32, mr: 2 }}
                      >
                        {player.nickname.charAt(0)}
                      </Avatar>
                      
                      <ListItemText
                        primary={
                          <Typography variant="body1" fontWeight="600">
                            {player.nickname}
                          </Typography>
                        }
                        sx={{ flex: 1 }}
                      />
                      
                      <Chip
                        label={`${player.score} 分`}
                        size="small"
                        sx={{
                          backgroundColor: rank <= 3 ? 'rgba(255,255,255,0.3)' : '#667eea',
                          color: rank <= 3 ? 'white' : 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    </Box>
                  </RankingItem>
                );
              })}
            </List>
          </CardContent>
        </LeaderboardCard>
      )}

    </StyledContainer>
  );
};

export default WhackAMoleGame;