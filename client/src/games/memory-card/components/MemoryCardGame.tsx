// 記憶卡片遊戲主組件
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import { useGameState } from '../hooks/useGameState';
import { useWebSocketHandler } from '../hooks/useWebSocketHandler';
import { CardGrid } from './CardGrid';
import { GameStatus } from './GameStatus';
import type { GameData, GameSettings, GameState } from '../types';

interface MemoryCardGameProps {
  roomId?: string;
  playerNickname?: string;
  isHost?: boolean;
  gameSettings?: GameSettings;
}

export const MemoryCardGame: React.FC<MemoryCardGameProps> = ({
  roomId: propRoomId,
  playerNickname: propPlayerNickname,
  isHost: propIsHost,
  gameSettings: propGameSettings
}) => {
  const { roomId: paramRoomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const [waitingForGameData, setWaitingForGameData] = useState(true);

  // 從 URL 參數或 props 獲取值
  const roomId = propRoomId || paramRoomId;
  const actualNickname = propPlayerNickname || (location.state as any)?.playerNickname || localStorage.getItem(`player_${roomId}`) || 'Player';
  const isHost = propIsHost || (location.state as any)?.isHost || false;
  const gameSettings = propGameSettings || (location.state as any)?.gameSettings;

  console.log(`[MemoryCardGame] [${new Date().toISOString()}] Component initialized:`, {
    roomId: roomId,
    playerNickname: actualNickname,
    isHost: isHost,
    gameSettings: gameSettings,
    locationState: location.state
  });

  // 遊戲狀態管理
  const { gameState, initializeGame, updateGameStatus, updateRank } = useGameState({
    roomId,
    gameSettings,
    initialTimeLeft: gameSettings?.duration ? gameSettings.duration * 60 : 60
  });

  // 追蹤本地選擇的卡片（使用positionId來精確控制）
  const [selectedCards, setSelectedCards] = useState<{ suit: string; value: string; positionId: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // 追蹤本地翻轉的卡片（用於動畫效果，使用positionId來精確控制）
  const [localFlippedCards, setLocalFlippedCards] = useState<{ suit: string; value: string; positionId: number }[]>([]);

  // WebSocket 消息處理
  const { sendCardClick, sendTwoCardsClick, isConnected } = useWebSocketHandler({
    roomId,
    playerNickname: actualNickname,
    isHost,
    onGameData: (data: GameData) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Received game data:`, {
        gameSettings: data.gameSettings,
        cardsCount: data.cards?.length || 0,
        gameTime: data.gameTime,
        roomId: roomId,
        playerNickname: actualNickname
      });
      initializeGame(data);
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Game initialized, setting waitingForGameData to false`);
      setWaitingForGameData(false);
    },
    onGameStarted: () => {
      console.log('[MemoryCardGame] Game started, waiting for game data...');
      setWaitingForGameData(true);
    },
    onCardFlipped: (suit: string, value: string, positionId?: number) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Server confirmed card flipped:`, {
        suit: suit,
        value: value,
        positionId: positionId,
        roomId: roomId,
        playerNickname: actualNickname
      });
      // 服務器確認卡片翻轉，保持翻轉狀態
    },
    onCardsFlippedBack: (cards: { suit: string; value: string }[]) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Cards flipped back:`, {
        cards: cards,
        roomId: roomId,
        playerNickname: actualNickname
      });
      // 移除本地翻轉狀態，讓卡片翻轉回背面（使用suit和value匹配，因為服務器返回的是suit和value）
      setLocalFlippedCards(prev => prev.filter(lfc => 
        !cards.some(c => c.suit === lfc.suit && c.value === lfc.value)
      ));
      setSelectedCards([]);
      setIsProcessing(false);
    },
    onCardsMatched: (cards: { suit: string; value: string }[]) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Cards matched:`, {
        cards: cards,
        roomId: roomId,
        playerNickname: actualNickname
      });
      // 卡片匹配成功，移除本地翻轉狀態（因為服務器會設置isMatched）
      setLocalFlippedCards(prev => prev.filter(lfc => 
        !cards.some(c => c.suit === lfc.suit && c.value === lfc.value)
      ));
      setSelectedCards([]);
      setIsProcessing(false);
    },
    onGameEnded: (data: any) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Game ended:`, {
        data: data,
        roomId: roomId,
        playerNickname: actualNickname
      });
      updateGameStatus('ended');
      updateRank(data.rank, data.totalPlayers);
    },
    onRankUpdate: (data: any) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Rank updated:`, {
        newRank: data.rank,
        totalPlayers: data.totalPlayers,
        roomId: roomId,
        playerNickname: actualNickname,
        currentRank: gameState.rank
      });
      updateGameStatus('ended');
    }
  });

  // 發送兩張卡片到服務器（包含positionId）
  const sendTwoCards = (cards: { suit: string; value: string; positionId: number }[]) => {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending two cards to server:`, {
      cards: cards,
      playerNickname: actualNickname,
      roomId: roomId
    });
    
    // 發送完整的卡片信息到服務器，包含positionId
    sendTwoCardsClick(cards);
  };

  // 處理卡片點擊
  const handleCardClick = (suit: string, value: string) => {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Card clicked:`, {
      suit: suit,
      value: value,
      gameStatus: gameState.status,
      playerNickname: actualNickname,
      roomId: roomId,
      flippedCards: gameState.cards.filter(c => c.isFlipped).length,
      matchedCards: gameState.cards.filter(c => c.isMatched).length,
      selectedCards: selectedCards,
      isProcessing: isProcessing
    });
    
    if (gameState.status !== 'playing') {
      console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Game not in playing state, ignoring card click:`, {
        currentStatus: gameState.status,
        suit: suit,
        value: value,
        playerNickname: actualNickname
      });
      return;
    }

    // 如果正在處理中，忽略點選
    if (isProcessing) {
      console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Currently processing, ignoring card click:`, {
        suit: suit,
        value: value,
        playerNickname: actualNickname
      });
      return;
    }

    const card = gameState.cards.find(c => c.suit === suit && c.value === value && c.positionId !== undefined);
    if (!card) {
      console.error(`[MemoryCardGame] [${new Date().toISOString()}] Card not found:`, {
        suit: suit,
        value: value,
        availableCards: gameState.cards.map(c => ({ suit: c.suit, value: c.value, positionId: c.positionId })),
        playerNickname: actualNickname
      });
      return;
    }
    
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Card clicked found:`, {
      cardSuit: card.suit,
      cardValue: card.value,
      playerNickname: actualNickname
    });
    
    if (card.isFlipped || card.isMatched) {
      console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Card already flipped or matched, ignoring click:`, {
        isFlipped: card.isFlipped,
        isMatched: card.isMatched,
        cardSuit: card.suit,
        cardValue: card.value,
        playerNickname: actualNickname
      });
      return;
    }

    // 檢查是否已經選擇過這張卡片（使用positionId精確匹配）
    if (selectedCards.some(sc => sc.positionId === card.positionId)) {
      console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Card already selected, ignoring click:`, {
        suit: suit,
        value: value,
        positionId: card.positionId,
        selectedCards: selectedCards,
        playerNickname: actualNickname
      });
      return;
    }

    // 檢查已選擇的卡片數量
    if (selectedCards.length >= 2) {
      console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Already selected 2 cards, ignoring click:`, {
        suit: suit,
        value: value,
        selectedCards: selectedCards,
        playerNickname: actualNickname
      });
      return;
    }

    const newSelectedCards = [...selectedCards, { suit, value, positionId: card.positionId }];
    setSelectedCards(newSelectedCards);
    
    // 立即翻轉卡片（本地動畫效果，使用positionId精確控制）
    setLocalFlippedCards(prev => [...prev, { suit, value, positionId: card.positionId }]);

    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Card selected locally and flipped:`, {
      cardSuit: card.suit,
      cardValue: card.value,
      selectedCards: newSelectedCards,
      localFlippedCards: [...localFlippedCards, { suit, value, positionId: card.positionId }],
      playerNickname: actualNickname
    });

    // 如果選擇了兩張卡片，發送到服務器
    if (newSelectedCards.length === 2) {
      setIsProcessing(true);
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Sending two cards to server:`, {
        selectedCards: newSelectedCards,
        playerNickname: actualNickname,
        roomId: roomId
      });
      sendTwoCards(newSelectedCards);
    }
  };

  // 儲存玩家暱稱到 localStorage
  useEffect(() => {
    if (roomId && actualNickname) {
      localStorage.setItem(`player_${roomId}`, actualNickname);
    }
  }, [roomId, actualNickname]);

  // 載入狀態
  if (waitingForGameData || gameState.cards.length === 0) {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Showing loading state:`, {
      waitingForGameData: waitingForGameData,
      cardsLength: gameState.cards.length,
      gameStatus: gameState.status,
      roomId: roomId,
      playerNickname: actualNickname
    });
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress />
          <Typography>載入遊戲中...</Typography>
        </Box>
      </Container>
    );
  }

  // 遊戲結束狀態
  if (gameState.status === 'ended') {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Showing game ended state:`, {
      rank: gameState.rank,
      totalPlayers: gameState.totalPlayers,
      score: gameState.score,
      roomId: roomId,
      playerNickname: actualNickname,
      gameStatus: gameState.status
    });
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            遊戲結束！
          </Typography>
          <Typography variant="h6">
            你的排名：第 {gameState.rank} 名 / 共 {gameState.totalPlayers} 人
          </Typography>
          <Typography variant="h6">
            最終得分：{gameState.score} 分
          </Typography>
        </Box>
      </Container>
    );
  }

  // 正常遊戲狀態
  console.log(`[MemoryCardGame] [${new Date().toISOString()}] Rendering game:`, {
    cardsLength: gameState.cards.length,
    gameStatus: gameState.status,
    timeLeft: gameState.timeLeft,
    score: gameState.score,
    roomId: roomId,
    playerNickname: actualNickname,
    selectedCards: selectedCards,
    isProcessing: isProcessing
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" flexDirection="column" gap={3}>
        <GameStatus gameState={gameState} />
        
        <CardGrid
           cards={gameState.cards}
           onCardClick={handleCardClick}
           disabled={(gameState.status as GameState['status']) === 'ended'}
           selectedCards={selectedCards}
           localFlippedCards={localFlippedCards}
         />
      </Box>
    </Container>
  );
};