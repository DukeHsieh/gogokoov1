import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Settings,
  SportsEsports,
} from '@mui/icons-material';
import WebSocketManager from '../../utils/WebSocketManager';

// 樣式組件
const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
}));

const WelcomeCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  padding: theme.spacing(4),
  textAlign: 'center',
  maxWidth: 500,
  width: '100%',
}));

const WhackAMoleHost: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // 主持人選擇打地鼠遊戲後，自動跳轉到設定頁面
    navigate(`/games/whack-a-mole/settings/${roomId}`);
  }, [roomId, navigate]);

  const handleGoToSettings = async () => {
    try {
      // 检查是否有现有的房间连接，如果有则重用，否则生成新的6位数房间号码
      const wsManager = WebSocketManager.getInstance();
      const existingGameState = wsManager.getGameState();
      const finalRoomId = existingGameState.roomId || roomId || Math.floor(100000 + Math.random() * 900000).toString();
      
      // 导航到游戏设置页面
      navigate(`/games/whack-a-mole/settings/${finalRoomId}`, {
        state: {
          isHost: true,
          fromHostPage: true,
        },
      });
    } catch (error) {
      console.error('Error navigating to settings:', error);
      // 如果出错，仍然尝试导航
      navigate(`/games/whack-a-mole/settings/${roomId}`);
    }
  };

  return (
    <StyledContainer>
      <WelcomeCard>
        <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
          <SportsEsports sx={{ fontSize: 48, color: '#667eea', mr: 2 }} />
          <Typography variant="h4" fontWeight="bold" color="#667eea">
            打地鼠遊戲
          </Typography>
        </Box>
        
        <Typography variant="h6" color="textSecondary" mb={4}>
          歡迎來到打地鼠遊戲！
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          startIcon={<Settings />}
          onClick={handleGoToSettings}
          fullWidth
          sx={{
            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
            borderRadius: 3,
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          進入遊戲設定
        </Button>
      </WelcomeCard>
    </StyledContainer>
  );
};

export default WhackAMoleHost;