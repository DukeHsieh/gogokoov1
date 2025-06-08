import React from 'react';
import { useLocation } from 'react-router-dom';
import { MemoryCardGame } from '../memory-card';

// GamePage 組件現在使用模組化的記憶卡片遊戲
const GamePage: React.FC = () => {
  const location = useLocation();
  const { playerNickname, isHost } = location.state || {};
  console.log(`[GamePage] [${new Date().toISOString()}] location.state:`, location.state);

  return <MemoryCardGame playerNickname={playerNickname} isHost={isHost} />;
};

export default GamePage;