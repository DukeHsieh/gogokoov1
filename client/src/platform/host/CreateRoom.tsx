import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  Paper,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { styled } from '@mui/material/styles';

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
    background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M100 100c20 0 40 20 40 40s-20 40-40 40-40-20-40-40 20-40 40-40zm100 0c15 0 30 15 30 30s-15 30-30 30-30-15-30-30 15-30 30-30zm100 50c25 0 45 20 45 45s-20 45-45 45-45-20-45-45 20-45 45-45zM50 250c18 0 35 17 35 35s-17 35-35 35-35-17-35-35 17-35 35-35zm150-50c22 0 42 20 42 42s-20 42-42 42-42-20-42-42 20-42 42-42zm100 100c20 0 40 20 40 40s-20 40-40 40-40-20-40-40 20-40 40-40z'/%3E%3C/g%3E%3C/svg%3E") repeat`,
    opacity: 0.3,
  },
}));

const FormCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
}));

const CreateRoom = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('歡樂遊戲室');
  const [roomDescription, setRoomDescription] = useState('一起來玩記憶大考驗吧！');
  const [maxPlayers, setMaxPlayers] = useState('8');

  const handleCreateRoom = () => {
    // 生成6位數房間號碼
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 導航到遊戲房間頁面，傳遞房間設定
    navigate(`/gameroom/${roomId}`, {
      state: {
        isHost: true,
        playerNickname: '主持人',
        roomSettings: {
          name: roomName,
          description: roomDescription,
          maxPlayers: parseInt(maxPlayers),
        },
      },
    });
  };

  return (
    <Container maxWidth="md">
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
              創建遊戲房間
            </Typography>
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                mb: 4,
                opacity: 0.9,
              }}
            >
              設定您的專屬遊戲空間
            </Typography>

            {/* 吉卜力風格房間圖片 */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 4,
              }}
            >
              <svg
                width="300"
                height="200"
                viewBox="0 0 300 200"
                style={{ borderRadius: '12px', background: '#87CEEB' }}
              >
                {/* 背景天空 */}
                <defs>
                  <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#87CEEB" />
                    <stop offset="100%" stopColor="#98FB98" />
                  </linearGradient>
                </defs>
                <rect width="300" height="200" fill="url(#skyGradient)" />
                
                {/* 雲朵 */}
                <ellipse cx="50" cy="30" rx="20" ry="12" fill="white" opacity="0.8" />
                <ellipse cx="250" cy="40" rx="25" ry="15" fill="white" opacity="0.8" />
                
                {/* 房子 */}
                <rect x="100" y="120" width="100" height="60" fill="#DEB887" />
                <polygon points="100,120 150,80 200,120" fill="#8B4513" />
                <rect x="120" y="140" width="15" height="25" fill="#654321" />
                <rect x="165" y="135" width="20" height="20" fill="#87CEEB" />
                
                {/* 樹木 */}
                <rect x="40" y="150" width="8" height="30" fill="#8B4513" />
                <circle cx="44" cy="145" r="15" fill="#228B22" />
                <rect x="250" y="140" width="10" height="40" fill="#8B4513" />
                <circle cx="255" cy="135" r="18" fill="#32CD32" />
                
                {/* 動物們 */}
                {/* 兔子 */}
                <ellipse cx="70" cy="170" rx="8" ry="6" fill="white" />
                <circle cx="70" cy="165" r="5" fill="white" />
                <ellipse cx="68" cy="162" rx="2" ry="4" fill="white" />
                <ellipse cx="72" cy="162" rx="2" ry="4" fill="white" />
                <circle cx="68" cy="164" r="1" fill="black" />
                <circle cx="72" cy="164" r="1" fill="black" />
                
                {/* 貓咪 */}
                <ellipse cx="220" cy="170" rx="10" ry="7" fill="#FF6347" />
                <circle cx="220" cy="162" r="6" fill="#FF6347" />
                <polygon points="217,158 220,155 223,158" fill="#FF6347" />
                <polygon points="217,158 220,155 223,158" fill="#FF6347" />
                <circle cx="218" cy="162" r="1" fill="black" />
                <circle cx="222" cy="162" r="1" fill="black" />
                
                {/* 小鳥 */}
                <ellipse cx="150" cy="100" rx="4" ry="3" fill="#FFD700" />
                <circle cx="150" cy="98" r="2" fill="#FFD700" />
                <polygon points="148,98 146,99 148,100" fill="#FFA500" />
                
                {/* 蝴蝶 */}
                <ellipse cx="180" cy="110" rx="3" ry="2" fill="#FF69B4" transform="rotate(15 180 110)" />
                <ellipse cx="180" cy="110" rx="3" ry="2" fill="#FF1493" transform="rotate(-15 180 110)" />
                <line x1="180" y1="108" x2="180" y2="112" stroke="black" strokeWidth="1" />
                
                {/* 花朵 */}
                <circle cx="30" cy="180" r="3" fill="#FF69B4" />
                <circle cx="27" cy="177" r="2" fill="#FF1493" />
                <circle cx="33" cy="177" r="2" fill="#FF1493" />
                <circle cx="27" cy="183" r="2" fill="#FF1493" />
                <circle cx="33" cy="183" r="2" fill="#FF1493" />
                
                <circle cx="270" cy="175" r="3" fill="#9370DB" />
                <circle cx="267" cy="172" r="2" fill="#8A2BE2" />
                <circle cx="273" cy="172" r="2" fill="#8A2BE2" />
                <circle cx="267" cy="178" r="2" fill="#8A2BE2" />
                <circle cx="273" cy="178" r="2" fill="#8A2BE2" />
              </svg>
            </Box>

            <FormCard>
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="房間名稱"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="房間說明"
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      variant="outlined"
                      multiline
                      rows={3}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="最大人數"
                      type="number"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(e.target.value)}
                      variant="outlined"
                      inputProps={{ min: 2, max: 20 }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/')}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      color: 'primary.main',
                      borderColor: 'primary.main',
                    }}
                  >
                    返回首頁
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleCreateRoom}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                      },
                    }}
                  >
                    建立房間
                  </Button>
                </Box>
              </CardContent>
            </FormCard>
          </Box>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default CreateRoom;