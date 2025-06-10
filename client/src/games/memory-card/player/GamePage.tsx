import React from 'react';
import { useLocation } from 'react-router-dom';
import { MemoryCardGame } from './MemoryCardGame';

// GamePage 組件現在使用模組化的記憶卡片遊戲
const GamePage: React.FC = () => {
  const location = useLocation();
  const { playerNickname, isHost, gameData, gameSettings } = location.state || {};
  console.log(`[GamePage] [${new Date().toISOString()}] location.state:`, location.state);
  console.log(`[GamePage] [${new Date().toISOString()}] gameData from WaitingRoom:`, gameData);
  console.log(`[GamePage] [${new Date().toISOString()}] gameSettings from WaitingRoom:`, gameSettings);

  return (
    <MemoryCardGame 
      playerNickname={playerNickname} 
      isHost={isHost} 
      gameSettings={gameSettings}
    />
  );
};

export default GamePage;