import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { RedEnvelopeGame } from './components/RedEnvelopeGame';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useWebSocketHandler } from '../memory-card/utils/useWebSocketHandler';
import type { Player, GameState, GameData } from './types';

interface GameControlProps {}

const GameControl: React.FC<GameControlProps> = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state as any;
  const playerNickname = gameState?.playerNickname || 'Player';
  const isHost = gameState?.isHost || false;
  const initialGameData = gameState?.gameData;
  const initialGameSettings = gameState?.gameSettings;
  
  console.log('[GameControl] Initial state from WaitingRoom:', {
    playerNickname,
    isHost,
    gameData: initialGameData,
    gameSettings: initialGameSettings
  });
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | undefined>();
  const [gameData, setGameData] = useState<GameData | undefined>(initialGameData);
  const [waitingForGameData, setWaitingForGameData] = useState(!initialGameData);

  // 使用 useWebSocketHandler 處理 WebSocket 連接和訊息
  const { sendScoreUpdate, isConnected } = useWebSocketHandler({
    roomId,
    playerNickname,
    isHost,
    onGameData: (data: any) => {
      console.log('[GameControl] Received game data:', data);
      setGameData(data);
      setWaitingForGameData(false);
    },
    onGameStarted: (data: any) => {
      console.log('[GameControl] Game started');
      if (data) {
        setGameData(data);
        setWaitingForGameData(false);
      } else {
        // 如果沒有遊戲數據，等待後續的 gameData 訊息
        setWaitingForGameData(true);
      }
    },
    onGameEnded: (data: any) => {
      console.log('[GameControl] Game ended:', data);
      // 處理遊戲結束邏輯
    },
    onPlayerListUpdate: (playerList: Player[]) => {
      console.log('[GameControl] Player list updated:', playerList);
      setPlayers(playerList);
      const player = playerList.find((p: Player) => p.nickname === playerNickname);
      setCurrentPlayer(player);
    },
    onScoreUpdate: (score: number) => {
      console.log('[GameControl] Score updated:', score);
      setCurrentPlayer(prev => prev ? { ...prev, score } : prev);
    }
  });

  // 檢查必要參數
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    console.log(`[GameControl] Initialized for room ${roomId} as ${playerNickname}`);
  }, [roomId, navigate, playerNickname]);

  const handleScoreUpdate = (score: number) => {
    console.log('[GameControl] Updating score:', score);
    sendScoreUpdate(score);
  };

  const handleGameEnd = () => {
    console.log('[GameControl] Game ended');
    // 遊戲結束邏輯由 useWebSocketHandler 的 onGameEnded 回調處理
  };

  // 如果沒有連接或等待遊戲數據，顯示載入狀態
  if (!isConnected || waitingForGameData) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="100vh"
        bgcolor="#1a1a2e"
        color="white"
      >
        <CircularProgress size={60} sx={{ color: '#ffd700', mb: 2 }} />
        <Typography variant="h6">
          {!isConnected ? '連接中...' : '準備遊戲中...'}
        </Typography>
      </Box>
    );
  }

  return (
    <RedEnvelopeGame
      gameData={gameData}
      players={players}
      currentPlayer={currentPlayer}
      onScoreUpdate={handleScoreUpdate}
      onGameEnd={handleGameEnd}
      isHost={isHost}
    />
  );
};

export default GameControl;