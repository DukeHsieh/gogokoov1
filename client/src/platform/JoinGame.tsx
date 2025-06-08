import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  Paper,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GamepadIcon from '@mui/icons-material/Gamepad';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='100' cy='100' r='20'/%3E%3Ccircle cx='200' cy='150' r='15'/%3E%3Ccircle cx='300' cy='200' r='25'/%3E%3Ccircle cx='150' cy='250' r='18'/%3E%3Ccircle cx='50' cy='300' r='22'/%3E%3C/g%3E%3C/svg%3E") repeat`,
  },
}));

const FormCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  maxWidth: 400,
  margin: '0 auto',
}));

const JoinGame = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [roomExists, setRoomExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    
    // 檢查房間是否存在（模擬API調用）
    const checkRoom = async () => {
      try {
        // 這裡應該是實際的API調用來檢查房間
        // 目前模擬房間總是存在
        setTimeout(() => {
          setRoomExists(true);
        }, 1000);
      } catch (err) {
        setRoomExists(false);
        setError('房間不存在或已關閉');
      }
    };
    
    checkRoom();
  }, [roomId, navigate]);

  const handleJoinGame = async () => {
    if (!nickname.trim()) {
      setError('請輸入您的暱稱');
      return;
    }
    
    if (nickname.trim().length < 2) {
      setError('暱稱至少需要2個字符');
      return;
    }
    
    if (nickname.trim().length > 20) {
      setError('暱稱不能超過20個字符');
      return;
    }
    
    setIsJoining(true);
    setError('');
    
    try {
      // 模擬加入房間的過程
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(`Attempting to join room ${roomId} with nickname: ${nickname.trim()}`);
      
      // 導航到平台等待頁面，作為玩家身份
      navigate(`/platform-waiting/${roomId}`, {
        state: {
          isHost: false,
          playerNickname: nickname.trim(),
        },
      });
    } catch (err) {
      setError('加入房間失敗，請稍後再試');
      setIsJoining(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isJoining && roomExists) {
      handleJoinGame();
    }
  };

  if (roomExists === null) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            正在檢查房間...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (roomExists === false) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ py: 8 }}>
          <StyledPaper>
            <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                房間不存在
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                您要加入的房間可能已關閉或不存在
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/')}
                sx={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'primary.main',
                  '&:hover': {
                    background: 'white',
                  },
                }}
              >
                返回首頁
              </Button>
            </Box>
          </StyledPaper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <StyledPaper>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <GamepadIcon sx={{ fontSize: 80, mb: 2, opacity: 0.9 }} />
              <Typography
                variant="h3"
                sx={{
                  mb: 2,
                  fontWeight: 700,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                加入遊戲
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  opacity: 0.9,
                }}
              >
                房間號碼: {roomId}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.8,
                }}
              >
                請輸入您的暱稱開始遊戲
              </Typography>
            </Box>

            <FormCard>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="您的暱稱"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setError('');
                    }}
                    onKeyPress={handleKeyPress}
                    variant="outlined"
                    placeholder="輸入2-20個字符的暱稱"
                    disabled={isJoining}
                    autoFocus
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '1.1rem',
                      },
                    }}
                  />
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/')}
                    disabled={isJoining}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      color: 'primary.main',
                      borderColor: 'primary.main',
                    }}
                  >
                    返回首頁
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleJoinGame}
                    disabled={isJoining || !nickname.trim()}
                    startIcon={
                      isJoining ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <PersonAddIcon />
                      )
                    }
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                      },
                    }}
                  >
                    {isJoining ? '加入中...' : '加入遊戲'}
                  </Button>
                </Box>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    加入後您將進入遊戲房間等待開始
                  </Typography>
                </Box>
              </CardContent>
            </FormCard>
          </Box>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default JoinGame;