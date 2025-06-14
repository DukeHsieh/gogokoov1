import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Slider,
  Card,
  CardContent,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { keyframes } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import type { GameSettings as RedEnvelopeGameSettings } from '../utils/types';
import WebSocketManager from '../../../utils/WebSocketManager';

// 吉卜力風格動畫
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(1deg); }
  50% { transform: translateY(-5px) rotate(0deg); }
  75% { transform: translateY(-15px) rotate(-1deg); }
`;

const sparkleAnimation = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

// 吉卜力風格容器
const GhibliContainer = styled(Container)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    #FF6B6B 0%, 
    #FF8E8E 25%, 
    #FFB6B6 50%, 
    #FFCCCC 75%, 
    #FFE0E0 100%
  )`,
  minHeight: '100vh',
  padding: '2rem 1rem',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.1"><circle cx="20" cy="20" r="2" fill="%23fff"/><circle cx="80" cy="30" r="1.5" fill="%23fff"/><circle cx="60" cy="70" r="1" fill="%23fff"/><circle cx="30" cy="80" r="2.5" fill="%23fff"/><circle cx="90" cy="60" r="1" fill="%23fff"/></svg>')`,
    animation: `${sparkleAnimation} 3s ease-in-out infinite`,
    pointerEvents: 'none',
  },
}));

// 動物裝飾組件
const AnimalDecorations = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 0,
  '& .animal': {
    position: 'absolute',
    fontSize: '2.5rem',
    animation: `${floatAnimation} 6s ease-in-out infinite`,
    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
  },
  '& .animal:nth-of-type(1)': {
    top: '15%',
    left: '10%',
    animationDelay: '0s',
  },
  '& .animal:nth-of-type(2)': {
    top: '25%',
    right: '15%',
    animationDelay: '2s',
  },
  '& .animal:nth-of-type(3)': {
    bottom: '20%',
    left: '12%',
    animationDelay: '4s',
  },
  '& .animal:nth-of-type(4)': {
    bottom: '30%',
    right: '10%',
    animationDelay: '1s',
  },
}));

// 吉卜力風格卡片
const GhibliCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: '20px',
  border: '3px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  zIndex: 1,
}));

interface LocalGameSettings extends RedEnvelopeGameSettings {
  participants: number;
}

const CreateRedEnvelopeGame = () => {
  const navigate = useNavigate();
  const [gameSettings, setGameSettings] = useState<LocalGameSettings>({
    title: '搶紅包大戰',
    description: '快速反應遊戲！搶奪從天而降的紅包，考驗你的手速和眼力。',
    duration: 3, // 遊戲時間（分鐘）
    envelopeCount: 50, // 紅包總數量
    dropSpeed: 1.0, // 掉落速度倍數
    participants: 10,
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;

    if (name === 'participants' || name === 'duration' || name === 'envelopeCount') {
      parsedValue = parseInt(value, 10) || 0;
    } else if (name === 'dropSpeed') {
      parsedValue = parseFloat(value) || 1.0;
    }

    setGameSettings(prev => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleSliderChange = (name: string) => (event: Event, newValue: number | number[]) => {
    setGameSettings(prev => ({
      ...prev,
      [name]: newValue as number,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // 檢查是否有現有的房間連接，如果有則重用，否則生成新的6位數房間號碼
      const wsManager = WebSocketManager.getInstance();
      const existingGameState = wsManager.getGameState();
      const roomId = existingGameState.roomId || Math.floor(100000 + Math.random() * 900000).toString();
      
      // 將遊戲設置保存到 localStorage
      localStorage.setItem(`game_${roomId}`, JSON.stringify({
        ...gameSettings,
        gameTime: gameSettings.duration * 60,
      }));

      // 導航到遊戲房間
      navigate(`/games/red-envelope/host/${roomId}`, {
        state: {
          gameSettings: {
            ...gameSettings,
            gameTime: gameSettings.duration * 60,
          },
          isHost: true,
          fromCreateGame: true,
        },
      });
    } catch (error) {
      console.error('Error creating room:', error);
      alert('創建房間時發生錯誤，請稍後再試');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <GhibliContainer maxWidth="md">
      {/* 動物裝飾 */}
      <AnimalDecorations>
        <div className="animal">🐱</div>
        <div className="animal">🧧</div>
        <div className="animal">🎊</div>
        <div className="animal">🎉</div>
      </AnimalDecorations>

      <GhibliCard>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontFamily: '"Comic Sans MS", "Microsoft JhengHei", sans-serif',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #FF6B6B, #FF4757, #FF3742)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              🧧 創建搶紅包遊戲
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#5D6D7E',
                fontFamily: '"Microsoft JhengHei", sans-serif',
              }}
            >
              設定你的搶紅包遊戲參數，開始一場刺激的反應力大戰！
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="遊戲標題"
                  name="title"
                  value={gameSettings.title}
                  onChange={handleChange}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '15px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="遊戲說明"
                  name="description"
                  value={gameSettings.description}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '15px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="參與人數"
                  name="participants"
                  type="number"
                  value={gameSettings.participants}
                  onChange={handleChange}
                  inputProps={{ min: 3, max: 20 }}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '15px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="遊戲時間（分鐘）"
                  name="duration"
                  type="number"
                  value={gameSettings.duration}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: 10 }}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '15px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontFamily: '"Microsoft JhengHei", sans-serif',
                    color: '#2C3E50',
                  }}
                >
                  🎯 遊戲難度設定
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: '#5D6D7E' }}
                >
                  紅包數量: {gameSettings.envelopeCount}
                </Typography>
                <Slider
                  value={gameSettings.envelopeCount}
                  onChange={handleSliderChange('envelopeCount')}
                  min={20}
                  max={100}
                  step={5}
                  marks={[
                    { value: 20, label: '簡單' },
                    { value: 50, label: '普通' },
                    { value: 100, label: '困難' },
                  ]}
                  sx={{
                    color: '#FF6B6B',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#FF4757',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#FF6B6B',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: '#5D6D7E' }}
                >
                  掉落速度: {gameSettings.dropSpeed.toFixed(1)}x
                </Typography>
                <Slider
                  value={gameSettings.dropSpeed}
                  onChange={handleSliderChange('dropSpeed')}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: '慢' },
                    { value: 1.0, label: '正常' },
                    { value: 2.0, label: '快' },
                  ]}
                  sx={{
                    color: '#FF6B6B',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#FF4757',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#FF6B6B',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/games')}
                    sx={{
                      borderRadius: '25px',
                      px: 4,
                      py: 1.5,
                      borderColor: '#FF6B6B',
                      color: '#FF6B6B',
                      '&:hover': {
                        borderColor: '#FF4757',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                      },
                    }}
                  >
                    返回
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isCreating}
                    startIcon={<SportsEsportsIcon />}
                    sx={{
                      borderRadius: '25px',
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(45deg, #FF6B6B, #FF4757)',
                      boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #FF4757, #FF3742)',
                        boxShadow: '0 6px 20px rgba(255, 107, 107, 0.4)',
                      },
                    }}
                  >
                    {isCreating ? '創建中...' : '遊戲開始'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </GhibliCard>
    </GhibliContainer>
  );
};

export default CreateRedEnvelopeGame;