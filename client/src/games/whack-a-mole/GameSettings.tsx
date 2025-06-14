import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PlayArrow,
  Settings,
  Timer,
  Speed,
  GpsFixed,
} from '@mui/icons-material';
import WebSocketManager from '../../utils/WebSocketManager';

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const SettingsCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  maxWidth: 600,
  width: '100%',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
}));

const SettingItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  borderRadius: 12,
  background: 'rgba(255, 255, 255, 0.8)',
}));

interface GameSettings {
  duration: number;
  moleSpawnInterval: number;
  moleLifetime: number;
  totalMoles: number;
}

const WhackAMoleGameSettings: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const wsManagerRef = useRef<WebSocketManager | null>(null);
  
  const [settings, setSettings] = useState<GameSettings>({
    duration: 60, // 遊戲時長（秒）
    moleSpawnInterval: 1000, // 地鼠生成間隔（毫秒）
    moleLifetime: 2000, // 地鼠存活時間（毫秒）
    totalMoles: 9, // 地鼠洞數量
  });

  // 組件初始化時使用 platform 建立好的連接
  useEffect(() => {
    if (!roomId) {
      console.error('Missing roomId');
      return;
    }

    const wsManager = WebSocketManager.getInstance();
    wsManagerRef.current = wsManager;
  }, [roomId]);

  const handleStartGame = () => {
    if (wsManagerRef.current) {
      wsManagerRef.current.send({
        type: 'hostStartGame',
        data: {
          gameType: 'whackmole',
          gameSettings: settings,
        },
      });
    }
    
    // 跳轉到主持人監控頁面
    navigate(`/games/whack-a-mole/monitor/${roomId}`);
  };

  const handleSettingChange = (key: keyof GameSettings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <StyledContainer>
      <SettingsCard>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <Settings sx={{ fontSize: 32, color: '#667eea', mr: 2 }} />
            <Typography variant="h4" fontWeight="bold" color="#333">
              打地鼠遊戲設定
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* 遊戲時長設定 */}
            <Grid item xs={12}>
              <SettingItem>
                <Box display="flex" alignItems="center" mb={2}>
                  <Timer sx={{ color: '#667eea', mr: 1 }} />
                  <Typography variant="h6" fontWeight="600">
                    遊戲時長
                  </Typography>
                </Box>
                <Box px={2}>
                  <Slider
                    value={settings.duration}
                    onChange={(_, value) => handleSettingChange('duration', value as number)}
                    min={30}
                    max={180}
                    step={15}
                    marks={[
                      { value: 30, label: '30秒' },
                      { value: 60, label: '1分鐘' },
                      { value: 120, label: '2分鐘' },
                      { value: 180, label: '3分鐘' },
                    ]}
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}秒`}
                  />
                </Box>
              </SettingItem>
            </Grid>

            {/* 地鼠生成間隔 */}
            <Grid item xs={12} md={6}>
              <SettingItem>
                <Box display="flex" alignItems="center" mb={2}>
                  <Speed sx={{ color: '#667eea', mr: 1 }} />
                  <Typography variant="h6" fontWeight="600">
                    生成間隔
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  type="number"
                  value={settings.moleSpawnInterval}
                  onChange={(e) => handleSettingChange('moleSpawnInterval', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <Typography variant="body2" color="textSecondary">毫秒</Typography>,
                  }}
                  inputProps={{ min: 500, max: 3000, step: 100 }}
                />
              </SettingItem>
            </Grid>

            {/* 地鼠存活時間 */}
            <Grid item xs={12} md={6}>
              <SettingItem>
                <Box display="flex" alignItems="center" mb={2}>
                  <Timer sx={{ color: '#667eea', mr: 1 }} />
                  <Typography variant="h6" fontWeight="600">
                    存活時間
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  type="number"
                  value={settings.moleLifetime}
                  onChange={(e) => handleSettingChange('moleLifetime', parseInt(e.target.value))}
                  InputProps={{
                    endAdornment: <Typography variant="body2" color="textSecondary">毫秒</Typography>,
                  }}
                  inputProps={{ min: 1000, max: 5000, step: 500 }}
                />
              </SettingItem>
            </Grid>

            {/* 地鼠洞數量 */}
            <Grid item xs={12}>
              <SettingItem>
                <Box display="flex" alignItems="center" mb={2}>
                  <GpsFixed sx={{ color: '#667eea', mr: 1 }} />
                  <Typography variant="h6" fontWeight="600">
                    地鼠洞數量
                  </Typography>
                </Box>
                <FormControl fullWidth>
                  <Select
                    value={settings.totalMoles}
                    onChange={(e) => handleSettingChange('totalMoles', e.target.value as number)}
                  >
                    <MenuItem value={6}>6個洞 (2x3)</MenuItem>
                    <MenuItem value={9}>9個洞 (3x3)</MenuItem>
                    <MenuItem value={12}>12個洞 (3x4)</MenuItem>
                    <MenuItem value={16}>16個洞 (4x4)</MenuItem>
                  </Select>
                </FormControl>
              </SettingItem>
            </Grid>
          </Grid>

          {/* 開始遊戲按鈕 */}
          <Box mt={4} display="flex" justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={handleStartGame}
              sx={{
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                borderRadius: 25,
                px: 4,
                py: 1.5,
                fontSize: '1.2rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                  boxShadow: '0 6px 25px rgba(102, 126, 234, 0.6)',
                },
              }}
            >
              開始遊戲
            </Button>
          </Box>
        </CardContent>
      </SettingsCard>
    </StyledContainer>
  );
};

export default WhackAMoleGameSettings;