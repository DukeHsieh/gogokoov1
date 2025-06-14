// 遊戲狀態顯示組件
import React from 'react';
import { Typography, Box, Paper } from '@mui/material';
import Avatar from '../../../components/Avatar';
import type { GameState } from '../utils/types';
import { formatTime } from './cardGenerator';

interface GameStatusProps {
  gameState: GameState;
  playerNickname?: string;
  playerAvatar?: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState, playerNickname, playerAvatar }) => {
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



  return (
    <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 玩家信息 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar avatar={playerAvatar || 'cat'} size={48} />
          <Box>
            <Typography variant="h6" color="text.primary">
              {playerNickname || '玩家'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              分數: {gameState.score}
            </Typography>
          </Box>
        </Box>
        
        {/* 時間顯示 */}
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
            {formatTime(gameState.timeLeft)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            剩餘時間
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};