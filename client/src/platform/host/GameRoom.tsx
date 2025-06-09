import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { styled } from '@mui/material/styles';
import Avatar from '../../components/Avatar';
import WebSocketManager from '../../utils/WebSocketManager';

interface Player {
  id: string;
  nickname: string;
  score: number;
  rank?: number;
  isHost?: boolean;
  avatar?: string;
}

interface RoomSettings {
  name: string;
  description: string;
  maxPlayers: number;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
}));

const QRCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  textAlign: 'center',
  padding: theme.spacing(3),
}));

const PlayerCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(1),
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'rgba(255, 255, 255, 1)',
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const roomSettings = location.state?.roomSettings as RoomSettings;
  const isHost = location.state?.isHost || false;
  const playerNickname = location.state?.playerNickname || '主持人';
  const gameSettings = location.state?.gameSettings; // 遊戲設定
  const autoStartMonitor = location.state?.autoStartMonitor || false; // 自動跳轉標記
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const ws = useRef<WebSocket | null>(null);
  const [connectionEstablished, setConnectionEstablished] = useState<boolean>(false);
  
  const joinUrl = `${window.location.origin}/join/${roomId}`;
  
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    
    // 初始化WebSocket連接
    const wsManager = WebSocketManager.getInstance();
    if (roomId && playerNickname) {
      wsManager.connect(roomId, playerNickname, isHost).catch(console.error);
    }
    
    // 添加消息處理器
    const handlePlayerJoined = (message: any) => {
      if (message.type === 'playerJoined') {
        console.log('Player joined:', message.data.player);
        // 玩家加入通知會通過playerListUpdate處理
      }
    };
    
    const handlePlayerListUpdate = (message: any) => {
      if (message.type === 'playerListUpdate') {
        console.log('Player list updated:', message.data.players);
        setPlayers(message.data.players.map((player: any) => ({
          id: player.id || player.nickname,
          nickname: player.nickname,
          score: player.score || 0,
          isHost: player.isHost || false,
          avatar: player.avatar || player.nickname,
        })));
        
        // 標記連接已建立
        if (!connectionEstablished) {
          setConnectionEstablished(true);
        }
      }
    };
    
    wsManager.addMessageHandler('gameroom-playerJoined', handlePlayerJoined, 'platform');
    wsManager.addMessageHandler('gameroom-playerListUpdate', handlePlayerListUpdate, 'platform');
    
    // 主持人不需要顯示在玩家列表中，所以不添加到players狀態
    
    return () => {
      // 清理WebSocket連接和消息處理器
      wsManager.removeMessageHandler('gameroom-playerJoined', 'platform');
      wsManager.removeMessageHandler('gameroom-playerListUpdate', 'platform');
    };
  }, [roomId, navigate, isHost, playerNickname]);
  
  // 自動跳轉到monitor頁面的邏輯
  useEffect(() => {
    if (autoStartMonitor && connectionEstablished && isHost && gameSettings) {
      // 延遲一下確保連接穩定
      const timer = setTimeout(() => {
        navigate(`/host-monitor/${roomId}`, {
          state: {
            gameSettings: gameSettings,
            playerNickname: playerNickname,
            isHost: true,
            roomId: roomId,
            fromPlatformRoom: true // 標記來自platform房間
          }
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [autoStartMonitor, connectionEstablished, isHost, gameSettings, roomId, playerNickname, navigate]);
  
  const handleStartGame = () => {
    // 導航到遊戲選擇頁面
    navigate('/games', {
      state: {
        roomId: roomId,
        isHost: true,
        playerNickname: playerNickname,
        roomSettings: roomSettings,
      },
    });
  };
  
  const handleBackToHome = () => {
    navigate('/');
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <StyledPaper>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              variant="h3"
              sx={{
                textAlign: 'center',
                mb: 2,
                fontWeight: 700,
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {roomSettings?.name || '遊戲房間'}
            </Typography>
            
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Chip
                label={`房間號碼: ${roomId}`}
                sx={{
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'primary.main',
                  px: 2,
                  py: 1,
                }}
              />
            </Box>
            
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                mb: 4,
                opacity: 0.9,
              }}
            >
              {roomSettings?.description || '歡迎來到遊戲房間！'}
            </Typography>
            
            <Grid container spacing={4}>
              {/* QR Code 區域 */}
              <Grid item xs={12} md={6}>
                <QRCard>
                  <Typography variant="h5" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                    掃描加入遊戲
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <QRCodeSVG
                      value={joinUrl}
                      size={200}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="M"
                      includeMargin={true}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    或直接訪問:
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => window.open(joinUrl, '_blank')}
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      wordBreak: 'break-all',
                      background: '#f5f5f5',
                      padding: 1,
                      borderRadius: 1,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      '&:hover': {
                        background: '#e0e0e0',
                      },
                    }}
                  >
                    {joinUrl}
                  </Button>
                </QRCard>
              </Grid>
              
              {/* 玩家列表區域 */}
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h5" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                      房間內玩家 ({players.filter(player => !player.isHost).length}/{roomSettings?.maxPlayers || 8})
                    </Typography>
                    
                    {players.filter(player => !player.isHost).length > 0 ? (
                      <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {players.filter(player => !player.isHost).map((player, index) => (
                          <PlayerCard key={player.id}>
                            <ListItem>
                              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <Box sx={{ mr: 2 }}>
                                  <Avatar
                                    avatar={player.avatar || player.nickname}
                                    size={40}
                                  />
                                </Box>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {player.nickname}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={`玩家 #${index + 1}`}
                                />
                              </Box>
                            </ListItem>
                          </PlayerCard>
                        ))}
                      </List>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                          等待玩家加入...
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          分享QR碼或房間號碼給朋友們吧！
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                      房間設定: 最多 {roomSettings?.maxPlayers || 8} 人
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* 控制按鈕 */}
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                size="large"
                onClick={handleBackToHome}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    background: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                返回首頁
              </Button>
              
              {isHost && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleStartGame}
                  disabled={players.length < 1}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: 'primary.main',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'white',
                    },
                    '&:disabled': {
                      background: 'rgba(255, 255, 255, 0.5)',
                      color: 'rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  進行遊戲
                </Button>
              )}
            </Box>
          </Box>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default GameRoom;