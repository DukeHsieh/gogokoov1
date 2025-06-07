// 記憶卡片遊戲主組件
import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useGameState } from '../hooks/useGameState';
import { useWebSocketHandler } from '../hooks/useWebSocketHandler';
import { useGameTimer } from '../hooks/useGameTimer';
import { GameStatus } from './GameStatus';
import { CardGrid } from './CardGrid';
import type { GameData } from '../types';

export const MemoryCardGame: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameStateFromLocation = location.state as any;
  const gameSettings = gameStateFromLocation?.gameSettings;
  const playerNickname = gameStateFromLocation?.playerNickname || 'Player';
  const isHost = gameStateFromLocation?.isHost || false;
  const waitingForGameData = gameStateFromLocation?.waitingForGameData || false;

  // Determine the actual nickname to use
  const actualNickname = (!playerNickname || playerNickname === 'Player') 
    ? localStorage.getItem(`player_${roomId}`) || `Player_${Date.now()}`
    : playerNickname;

  // 遊戲狀態管理
  const {
    gameState,
    initializeGameWithData,
    updateScore,
    updateRank,
    flipCard,
    flipCardsBack,
    markCardsAsMatched,
    updateGameStatus,
    updateTimeLeft
  } = useGameState({
    roomId,
    gameSettings,
    initialTimeLeft: gameSettings?.duration ? gameSettings.duration * 60 : 60
  });

  // WebSocket 消息處理
  const { sendCardClick, isConnected } = useWebSocketHandler({
    roomId,
    playerNickname: actualNickname,
    isHost,
    onGameData: (data: GameData) => {
      initializeGameWithData(data);
    },
    onScoreUpdate: updateScore,
    onRankUpdate: updateRank,
    onCardFlipped: flipCard,
    onCardsFlippedBack: flipCardsBack,
    onCardsMatched: markCardsAsMatched,
    onGameEnded: (data) => {
      updateGameStatus('ended');
      updateRank(data.rank, data.totalPlayers);
    },
    onTimeUpdate: updateTimeLeft
  });

  // 遊戲計時器
  useGameTimer({
    isActive: gameState.status === 'playing',
    timeLeft: gameState.timeLeft,
    onTimeUpdate: updateTimeLeft,
    onTimeUp: () => {
      updateGameStatus('ended');
    }
  });

  // 處理卡片點擊
  const handleCardClick = (cardId: number) => {
    if (gameState.status !== 'playing') return;
    
    const card = gameState.cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    sendCardClick(cardId);
  };

  // 儲存玩家暱稱到 localStorage
  useEffect(() => {
    if (roomId && actualNickname) {
      localStorage.setItem(`player_${roomId}`, actualNickname);
    }
  }, [roomId, actualNickname]);

  // 載入狀態
  if (waitingForGameData || gameState.cards.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress />
          <Typography>載入遊戲中...</Typography>
        </Box>
      </Container>
    );
  }

  // 連線狀態檢查
  if (!isConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Typography variant="h5" color="error">
            連線已中斷
          </Typography>
          <Typography>
            請重新整理頁面或檢查網路連線
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box>
        <GameStatus gameState={gameState} />
        
        {(gameState.status === 'playing' || gameState.status === 'ended') && (
          <CardGrid
            cards={gameState.cards}
            onCardClick={handleCardClick}
            disabled={gameState.status === 'ended'}
          />
        )}
      </Box>
    </Container>
  );
};