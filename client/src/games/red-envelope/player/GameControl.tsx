import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { RedEnvelopeGame } from './RedEnvelopeGame';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useWebSocketHandler } from '../utils/hooks/useWebSocketHandler';
import type { Player, GameState, GameData } from '../utils/types';

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
  
  // 使用gameSettings直接構建gameData，不再等待服務端的gameData
  const gameData: GameData | undefined = useMemo(() => {
    if (initialGameSettings) {
      return {
        gameSettings: {
          ...initialGameSettings,
          gameTime: initialGameSettings.gameTime || initialGameSettings.duration * 60
        },
        envelopes: [], // 初始為空，遊戲開始後會從服務端接收
        gameTime: initialGameSettings.gameTime || initialGameSettings.duration * 60
      };
    }
    return initialGameData;
  }, [initialGameSettings, initialGameData]);

  // 使用 useWebSocketHandler 處理 WebSocket 連接和訊息
  const { sendScoreUpdate, sendEnvelopeCollected, sendGameEnded } = useWebSocketHandler({
    roomId,
    playerNickname,
    isHost,
    onGameStarted: (data: any) => {
      console.log('[GameControl] Game started:', data);
      // 遊戲開始，但不再依賴服務端的gameData來初始化
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
    },
    onEnvelopeCollected: (envelope) => {
      console.log('[GameControl] Envelope collected:', envelope);
      // 紅包收集處理邏輯可以在這裡添加
    },
    onEnvelopeSpawned: (envelope) => {
      console.log('[GameControl] Envelope spawned:', envelope);
      // 新紅包生成處理邏輯可以在這裡添加
    },
    onEnvelopesUpdate: (envelopes) => {
      console.log('[GameControl] Envelopes updated:', envelopes);
      // 紅包狀態更新處理邏輯可以在這裡添加
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

  const handleGameEnd = (finalScore?: number) => {
    console.log('[GameControl] Game ended with final score:', finalScore);
    if (finalScore !== undefined) {
      sendGameEnded(finalScore);
    }
    // 遊戲結束邏輯由 useWebSocketHandler 的 onGameEnded 回調處理
  };

  const handleEnvelopeCollected = (envelopeId: string, value: number) => {
    console.log('[GameControl] Envelope collected:', { envelopeId, value });
    sendEnvelopeCollected(envelopeId, value);
  };

  console.log('[GameControl] Current game data:', gameData);
  // 如果沒有遊戲數據，顯示載入狀態
  if (!gameData) {
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
          載入遊戲設定中...
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
      onEnvelopeCollected={handleEnvelopeCollected}
      isHost={isHost}
    />
  );
};

export default GameControl;