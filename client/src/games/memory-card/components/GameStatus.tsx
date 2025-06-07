// 遊戲狀態顯示組件
import React from 'react';
import { Typography, Box, Paper } from '@mui/material';
import type { GameState } from '../types';
import { formatTime } from '../utils/cardGenerator';

interface GameStatusProps {
  gameState: GameState;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState }) => {
  if (gameState.status === 'ended') {
    return (
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          遊戲結束！
        </Typography>
        <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
          最終排名：{gameState.rank}/{gameState.totalPlayers}
        </Typography>
        <Typography variant="h6">
          得分：{gameState.score}
        </Typography>
      </Paper>
    );
  }

  if (gameState.status === 'waiting') {
    return (
      <Typography variant="h5" align="center" sx={{ mb: 4 }}>
        等待遊戲開始...
      </Typography>
    );
  }

  return (
    <Typography variant="h5" align="center" sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Typography variant="h6" color="secondary">
            分數: {gameState.score}
          </Typography>
          <Typography variant="h6" color="primary">
            {formatTime(gameState.timeLeft)}
          </Typography>
        </Box>
      </Box>
    </Typography>
  );
};