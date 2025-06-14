import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import WebSocketManager from '../../utils/WebSocketManager';

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

const MoleHole = styled(Box)<{ isActive: boolean; isHit: boolean }>(({ theme, isActive, isHit }) => ({
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

const Mole = styled(Box)<{ isVisible: boolean }>(({ theme, isVisible }) => ({
  width: '70%',
  height: '70%',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #8d6e63 0%, #6d4c41 100%)',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
  animation: isVisible 
    ? `${moleAppear} 0.3s ease-out`
    : `${moleDisappear} 0.3s ease-in`,
  '&::before': {
    content: '"🐹"',
    fontSize: '2rem',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.2rem',
    '&::before': {
      fontSize: '1.5rem',
    },
  },
}));

const ScoreCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
}));

interface Player {
  id: string;
  nickname: string;
  score: number;
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
}

const WhackAMoleGame: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const wsManagerRef = useRef<WebSocketManager | null>(null);

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

  // 組件初始化時使用 platform 建立好的連接
  useEffect(() => {
    if (!roomId) {
      console.error('Missing roomId');
      return;
    }

    const wsManager = WebSocketManager.getInstance();
    wsManagerRef.current = wsManager;
    
    // 添加消息處理器
    wsManager.addMessageHandler('whackAMoleGame', (message: any) => {
      console.log('[WhackAMoleGame] Received message:', message);
      handleWebSocketMessage(message);
    });
    
    // 直接設置遊戲為開始狀態
    setGameState(prev => ({
      ...prev,
      isActive: true
    }));
    
    return () => {
      // 清理消息處理器
      wsManager.removeMessageHandler('whackAMoleGame');
    };
  }, [roomId]);



  // 處理 WebSocket 消息
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'gameStarted':
        setGameState(prev => ({
          ...prev,
          isActive: true,
          timeLeft: message.data?.gameSettings?.duration || 60,
          totalTime: message.data?.gameSettings?.duration || 60,
          settings: message.data?.gameSettings || prev.settings,
          moles: [],
          score: 0,
        }));
        setIsWaitingForGame(false);
        setShowGameOver(false);
        break;
        
      case 'gameEnd':
        setGameState(prev => ({
          ...prev,
          isActive: false,
          timeLeft: 0,
          moles: [],
        }));
        setShowGameOver(true);
        break;
        
      case 'timeUpdate':
        setGameState(prev => ({
          ...prev,
          timeLeft: message.data?.timeLeft ?? prev.timeLeft,
        }));
        break;
        
      case 'moleSpawned':
        setMoleHoles(prev => 
          prev.map(hole => 
            message.data.holeIds?.includes(hole.id)
              ? { ...hole, isActive: true, isHit: false }
              : hole
          )
        );
        setGameState(prev => ({
          ...prev,
          moles: [...prev.moles, {
            id: message.data.moleId,
            position: message.data.position,
            isVisible: true,
            timeLeft: message.data.lifetime || 3,
          }],
        }));
        break;
        
      case 'moleHidden':
        setMoleHoles(prev => 
          prev.map(hole => 
            message.data.holeIds?.includes(hole.id)
              ? { ...hole, isActive: false, isHit: false }
              : hole
          )
        );
        setGameState(prev => ({
          ...prev,
          moles: prev.moles.filter(mole => mole.id !== message.data.moleId),
        }));
        break;
        
      case 'scoreUpdate':
        if (message.data.playerId === 'current') {
          setGameState(prev => ({ ...prev, score: message.data.score }));
        }
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p => 
            p.id === message.data.playerId 
              ? { ...p, score: message.data.score }
              : p
          ),
        }));
        break;
        
      case 'playerJoined':
        setGameState(prev => ({
          ...prev,
          players: [...prev.players, message.data.player],
        }));
        break;
        
      case 'playerLeft':
        setGameState(prev => ({
          ...prev,
          players: prev.players.filter(p => p.id !== message.data.playerId),
        }));
        break;
    }
  };



  // 擊打地鼠
  const handleMoleHit = useCallback((holeId: number) => {
    if (!gameState.isActive) return;
    
    const hole = moleHoles.find(h => h.id === holeId);
    if (!hole || !hole.isActive || hole.isHit) return;

    // 本地立即反饋
    setMoleHoles(prev => 
      prev.map(h => 
        h.id === holeId ? { ...h, isHit: true } : h
      )
    );

    // 移除被擊中的地鼠
    setGameState(prev => ({
      ...prev,
      moles: prev.moles.filter(mole => mole.position !== holeId),
      score: prev.score + 10, // 固定得分
    }));

    // 發送擊中消息到服務器
    if (wsManagerRef.current) {
      wsManagerRef.current.send({
        type: 'moleHit',
        data: {
          holeId: holeId,
          score: gameState.score + 10,
        },
      });
    }

    // 重置擊中狀態
    setTimeout(() => {
      setMoleHoles(prev => 
        prev.map(h => 
          h.id === holeId ? { ...h, isHit: false } : h
        )
      );
    }, 300);
  }, [gameState.isActive, gameState.score, moleHoles]);



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

      {/* 我的得分 */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <ScoreCard sx={{ maxWidth: 300, mx: 'auto' }}>
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
                    <Mole isVisible={hole.isActive && !hole.isHit} />
                  )}
                </MoleHole>
              </Box>
            </Grid>
          ))}
        </Grid>
      </GameBoard>


    </StyledContainer>
  );
};

export default WhackAMoleGame;