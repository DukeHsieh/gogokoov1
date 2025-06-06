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
  const initialAvatar = (location.state as any)?.playerAvatar || 'cat';

  console.log(`[MemoryCardGame] [${new Date().toISOString()}] Component initialized:`, {
    roomId: roomId,
    playerNickname: actualNickname,
    isHost: isHost,
    gameSettings: gameSettings,
    locationState: location.state
  });

  // 遊戲狀態管理
  const { gameState, setGameState, initializeGame, updateGameStatus, updateRank, updateScore, updateTimeLeft } = useGameState({
    roomId,
    gameSettings,
    initialTimeLeft: 0 // Server will control time
  });

  // 追蹤本地選擇的卡片（使用positionId來精確控制）
  const [selectedCards, setSelectedCards] = useState<{ suit: string; value: string; positionId: number }[]>([]);
  const [playerAvatar, setPlayerAvatar] = useState<string>(initialAvatar);
  const [isProcessing, setIsProcessing] = useState(false);
  // 追蹤本地翻轉的卡片（用於動畫效果，使用positionId來精確控制）
  const [localFlippedCards, setLocalFlippedCards] = useState<{ suit: string; value: string; positionId: number }[]>([]);

  // WebSocket 消息處理
  const { sendScoreUpdate, isConnected } = useWebSocketHandler({
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
    },
    onScoreUpdate: (score: number) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Received score update from server:`, {
        newScore: score,
        currentScore: gameState.score,
        playerNickname: actualNickname,
        roomId: roomId
      });
      // 更新本地分数状态
      updateScore(score);
    },
    onTimeUpdate: (timeLeft: number) => {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Received time update from server:`, {
        timeLeft: timeLeft,
        currentTimeLeft: gameState.timeLeft,
        playerNickname: actualNickname,
        roomId: roomId
      });
      // 更新本地時間狀態
      updateTimeLeft(timeLeft);
    },
    onPlayerListUpdate: (players: any[]) => {
      // 找到當前玩家並更新頭像
      const currentPlayer = players.find(p => p.nickname === actualNickname);
      if (currentPlayer && currentPlayer.avatar) {
        console.log(`[MemoryCardGame] [${new Date().toISOString()}] Updating player avatar:`, {
          playerNickname: actualNickname,
          avatar: currentPlayer.avatar
        });
        setPlayerAvatar(currentPlayer.avatar);
      }
    }
  });

  // 客戶端配對檢查機制
  const checkForMatch = (cards: { suit: string; value: string; positionId: number }[]) => {
    if (cards.length !== 2) return;
    
    const [card1, card2] = cards;
    const isMatch = card1.suit === card2.suit && card1.value === card2.value;
    
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Checking for match:`, {
      card1: card1,
      card2: card2,
      isMatch: isMatch,
      playerNickname: actualNickname,
      roomId: roomId
    });
    
    if (isMatch) {
      // 配對成功：更新本地遊戲狀態，標記卡片為已配對
      setGameState(prev => ({
        ...prev,
        cards: prev.cards.map(card => {
          if (card.positionId === card1.positionId || card.positionId === card2.positionId) {
            return { ...card, isMatched: true, isFlipped: true };
          }
          return card;
        })
      }));
      
      // 移除本地翻轉狀態
      setLocalFlippedCards(prev => prev.filter(lfc => 
        lfc.positionId !== card1.positionId && lfc.positionId !== card2.positionId
      ));
      
      // 只有非主機玩家才能得分
      if (!isHost) {
        const newScore = (gameState.score || 0) + 10;
        // 發送分數更新到伺服器
        sendScoreUpdate(newScore);
      }
      
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Match found! Cards matched locally:`, {
        card1: card1,
        card2: card2,
        newScore: !isHost ? (gameState.score || 0) + 10 : gameState.score,
        playerNickname: actualNickname
      });
      
      // 立即清除選擇和處理狀態
      setSelectedCards([]);
      setIsProcessing(false);
    } else {
      // 配對失敗：2秒後翻轉回背面
      setTimeout(() => {
        setLocalFlippedCards(prev => prev.filter(lfc => 
          lfc.positionId !== card1.positionId && lfc.positionId !== card2.positionId
        ));
        
        // 清除選擇狀態和處理狀態
        setSelectedCards([]);
        setIsProcessing(false);
        
        console.log(`[MemoryCardGame] [${new Date().toISOString()}] No match, cards flipped back:`, {
          card1: card1,
          card2: card2,
          playerNickname: actualNickname
        });
      }, 2000);
    }
  };

  // 處理卡片點擊
  const handleCardClick = (positionId: number, suit: string, value: string) => {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Card clicked:`, {
      positionId: positionId,
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
        positionId: positionId,
        suit: suit,
        value: value,
        playerNickname: actualNickname
      });
      return;
    }

    // 如果正在處理中，忽略點選
    if (isProcessing) {
      console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Currently processing, ignoring card click:`, {
        positionId: positionId,
        suit: suit,
        value: value,
        playerNickname: actualNickname
      });
      return;
    }

    // 直接使用 positionId 查找卡牌，確保精確匹配
    const card = gameState.cards.find(c => c.positionId === positionId);
    if (!card) {
      console.error(`[MemoryCardGame] [${new Date().toISOString()}] Card not found with positionId:`, {
        positionId: positionId,
        suit: suit,
        value: value,
        availableCards: gameState.cards.map(c => ({ suit: c.suit, value: c.value, positionId: c.positionId })),
        playerNickname: actualNickname
      });
      return;
    }
    
    // 驗證客戶端傳來的 suit/value 與 positionId 對應的卡牌是否一致
    if (card.suit !== suit || card.value !== value) {
      console.error(`[MemoryCardGame] [${new Date().toISOString()}] Card data mismatch:`, {
        positionId: positionId,
        expectedSuit: card.suit,
        expectedValue: card.value,
        receivedSuit: suit,
        receivedValue: value,
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

    // 檢查是否已經被選中（使用 positionId 作為主要識別）
    const isAlreadySelected = selectedCards.some(selected => selected.positionId === positionId);
    
    if (isAlreadySelected) {
      console.warn(`[MemoryCardGame] [${new Date().toISOString()}] Card already selected:`, {
        positionId: positionId,
        suit: suit,
        value: value,
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

    // 添加到選中列表
    const newSelectedCard = { suit: suit, value: value, positionId: positionId };
    const newSelectedCards = [...selectedCards, newSelectedCard];
    setSelectedCards(newSelectedCards);

    // 立即觸發本地翻轉動畫（使用 positionId 作為主要識別）
    setLocalFlippedCards(prev => {
      const isAlreadyFlipped = prev.some(flipped => flipped.positionId === positionId);
      if (!isAlreadyFlipped) {
        return [...prev, { suit: suit, value: value, positionId: positionId }];
      }
      return prev;
    });

    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Card selected locally and flipped:`, {
      cardSuit: card.suit,
      cardValue: card.value,
      cardPositionId: positionId,
      selectedCardsCount: newSelectedCards.length,
      playerNickname: actualNickname
    });

    // 如果選擇了兩張卡片，進行客戶端配對檢查
    if (newSelectedCards.length === 2) {
      console.log(`[MemoryCardGame] [${new Date().toISOString()}] Two cards selected, checking for match:`, {
        cards: newSelectedCards,
        playerNickname: actualNickname
      });
      
      setIsProcessing(true);
      checkForMatch(newSelectedCards);
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

  // 遊戲結束狀態 - 顯示結果但保留撲克牌
  const isGameEnded = gameState.status === 'ended';
  if (isGameEnded) {
    console.log(`[MemoryCardGame] [${new Date().toISOString()}] Showing game ended state:`, {
      rank: gameState.rank,
      totalPlayers: gameState.totalPlayers,
      score: gameState.score,
      roomId: roomId,
      playerNickname: actualNickname,
      gameStatus: gameState.status
    });
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
        {/* 遊戲結束時顯示結果 */}
        {isGameEnded && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} sx={{ mb: 2 }}>
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
        )}
        
        <GameStatus gameState={gameState} playerNickname={actualNickname} playerAvatar={playerAvatar} />
        
        <CardGrid
           cards={gameState.cards}
           onCardClick={handleCardClick}
           disabled={isGameEnded}
           selectedCards={selectedCards}
           localFlippedCards={localFlippedCards}
         />
      </Box>
    </Container>
  );
};