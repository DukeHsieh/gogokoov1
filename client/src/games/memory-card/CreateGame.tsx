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
} from '@mui/material';

interface GameSettings {
  title: string;
  description: string;
  type: string;
  participants: number;
  duration: number;
  cardCount: number;
  // hostNickname: string; // Removed
}

const CreateGame = () => {
  const navigate = useNavigate();
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    title: '記憶卡牌',
    description: '考驗你的記憶力，找出配對的卡牌！',
    type: 'memory',
    participants: 100,
    duration: 1,
    cardCount: 12,
    // hostNickname: '小狗', // Removed
  });

  const gameTypes = [
    { value: 'memory', label: '記憶大考驗' },
    { value: 'custom', label: '自訂遊戲' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;

    // 處理數字類型的輸入
    if (name === 'participants' || name === 'duration' || name === 'cardCount') {
      parsedValue = parseInt(value) || 0;

      // 驗證卡牌數量
      if (name === 'cardCount') {
        if (parsedValue > 50) parsedValue = 50;
        if (parsedValue < 2) parsedValue = 2;
        // 確保為偶數
        if (parsedValue % 2 !== 0) parsedValue = parsedValue - 1;
      }

      // 驗證遊戲時間
      if (name === 'duration') {
        if (parsedValue > 10) parsedValue = 10;
        if (parsedValue < 1) parsedValue = 1;
      }

      // 驗證參與人數
      if (name === 'participants') {
        if (parsedValue < 1) parsedValue = 1;
      }
    }

    setGameSettings((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setGameSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // if (!gameSettings.hostNickname.trim()) { // Removed validation
    //   alert('請輸入主持人暱稱');
    //   return;
    // }
    
    // 生成6位數房間號碼
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    // 保存遊戲設置到 localStorage
    // We still save the game settings, but hostNickname is no longer part of it.
    // However, the server now gets the host nickname from URL parameters.
    // For client-side display consistency before WebSocket connection, we can pass a default.
    // const hostNicknameForState = "主持人"; // Default host nickname - No longer needed
    localStorage.setItem(`game_${roomId}`, JSON.stringify({...gameSettings })); // hostNickname removed from gameSettings

    // 跳轉到遊戲房間，並傳遞主持人狀態 (主持人不需要暱稱)
    navigate(`/gameroom/${roomId}`, {
      state: {
        // nickname: hostNicknameForState, // Host does not need a nickname passed via state
        isHost: true
      }
    });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          創建新遊戲
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          設計您的互動遊戲，創造獨特的主持體驗
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="game-type-label">遊戲類型</InputLabel>
                <Select
                  labelId="game-type-label"
                  id="type"
                  name="type"
                  value={gameSettings.type}
                  label="遊戲類型"
                  onChange={handleSelectChange}
                  required
                >
                  {gameTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="title"
                name="title"
                label="遊戲標題"
                value={gameSettings.title}
                onChange={handleChange}
              />
            </Grid>


            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="description"
                name="description"
                label="遊戲說明"
                multiline
                rows={4}
                value={gameSettings.description}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                type="number"
                id="participants"
                name="participants"
                label="最大參與人數"
                 inputProps={{ min: 1, max: 100 }}
                 helperText="最多100人"
                value={gameSettings.participants}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                type="number"
                id="duration"
                name="duration"
                label="遊戲時間（分鐘）"
                inputProps={{ min: 1, max: 10 }}
                value={gameSettings.duration}
                onChange={handleChange}
                helperText="最長10分鐘"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                required
                fullWidth
                type="number"
                id="cardCount"
                name="cardCount"
                label="卡牌數量"
                inputProps={{ min: 2, max: 50, step: 2 }}
                value={gameSettings.cardCount}
                onChange={handleChange}
                helperText="2-50張，必須為偶數"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setGameSettings({
                    title: '記憶卡牌',
                    description: '考驗你的記憶力，找出配對的卡牌！',
                    type: 'memory',
                    participants: 100,
                    duration: 1,
                    cardCount: 12,
                    // hostNickname: '', // Removed
                  })}
                >
                  重置
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  創建遊戲
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateGame;