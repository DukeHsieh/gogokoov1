import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import WebSocketManager from '../utils/WebSocketManager';
import { Grid, Card as MuiCard, CardContent, Typography, Container, Box, CircularProgress, Paper, Fade } from '@mui/material';

// 音效播放函數
const playSound = (frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.log('音效播放失敗:', error);
  }
};

// 不同類型的音效
const soundEffects = {
  flip: () => playSound(800, 0.1), // 翻牌音效
  match: () => {
    // 配對成功音效 - 上升音調
    playSound(523, 0.15); // C5
    setTimeout(() => playSound(659, 0.15), 100); // E5
    setTimeout(() => playSound(784, 0.2), 200); // G5
  },
  mismatch: () => {
    // 配對失敗音效 - 下降音調
    playSound(400, 0.3, 'square');
  },
  gameOver: () => {
    // 遊戲結束音效 - 勝利旋律
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((note, index) => {
      setTimeout(() => playSound(note, 0.3), index * 150);
    });
  }
};

interface GameCard {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface GameState {
  status: 'waiting' | 'playing' | 'ended';
  timeLeft: number;
  cards: GameCard[];
  score: number;
  rank: number;
  totalPlayers: number;
}

const GamePage: React.FC = () => {
  const { roomID } = useParams<{ roomID: string }>();
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameStateFromLocation = location.state as any;
  const gameSettings = gameStateFromLocation?.gameSettings;
  const playerNickname = gameStateFromLocation?.playerNickname || 'Player';
  const isHost = gameStateFromLocation?.isHost || false;
  const waitingForGameData = gameStateFromLocation?.waitingForGameData || false;

  const [storedGameSettings, setStoredGameSettings] = useState<any>(null);
  
  // 從 localStorage 讀取遊戲設定
  useEffect(() => {
    if (roomID) {
      const storedSettings = localStorage.getItem(`game_${roomID}`);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        setStoredGameSettings(settings);
        console.log('[GamePage] Loaded game settings from localStorage:', settings);
      }
    }
  }, [roomID]);
  
  // 計算實際的遊戲時間
  const getActualGameDuration = useCallback(() => {
    if (storedGameSettings) {
      return storedGameSettings.duration * 60; // 分鐘轉秒
    }
    return gameStateFromLocation?.timeLeft || gameSettings?.duration || 60;
  }, [storedGameSettings, gameStateFromLocation?.timeLeft, gameSettings?.duration]);

  const [gameState, setGameState] = useState<GameState>({
    status: 'playing',
    timeLeft: getActualGameDuration(),
    cards: [],
    score: 0,
    rank: 0,
    totalPlayers: 0,
  });
  
  // 當 storedGameSettings 更新時，更新遊戲時間
  useEffect(() => {
    if (storedGameSettings) {
      const actualGameDuration = storedGameSettings.duration * 60;
      setGameState(prev => ({
        ...prev,
        timeLeft: actualGameDuration
      }));
      console.log('[GamePage] Updated game time with stored settings:', actualGameDuration);
    }
  }, [storedGameSettings]);

  // 生成卡牌
  const generateCards = useCallback((count: number): GameCard[] => {
    const cardImages: string[] = [];
    
    // 定義撲克牌圖片檔名
    const suits = ['spade', 'heart', 'diamond', 'club'];
    const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
    
    // 生成撲克牌圖片路徑
    for (const suit of suits) {
      for (const value of values) {
        if (cardImages.length < count) {
          const imagePath = `/assets/images/cards/${suit}_${value}.png`;
          cardImages.push(imagePath);
          cardImages.push(imagePath); // 每張牌有兩張用於配對
        }
      }
    }
    
    // 如果需要更多卡牌，重複使用
    while (cardImages.length < count) {
      const randomIndex = Math.floor(Math.random() * (cardImages.length / 2)) * 2;
      cardImages.push(cardImages[randomIndex]);
      cardImages.push(cardImages[randomIndex]);
    }
    
    // 只取需要的數量
    const selectedCards = cardImages.slice(0, count);

    // 洗牌
    for (let i = selectedCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedCards[i], selectedCards[j]] = [selectedCards[j], selectedCards[i]];
    }

    return selectedCards.map((imagePath, index) => ({
      id: index,
      value: imagePath,
      isFlipped: false,
      isMatched: false,
    }));
  }, []);

  const initializeGameWithData = useCallback((gameData: any) => {
    console.log('Initializing game with data:', gameData);
    
    // 優先使用server傳來的設定，不使用預設值
    if (!gameData.gameSettings?.numPairs || !gameData.gameTime) {
      console.error('[GamePage] Missing required game settings from server:', gameData);
      return;
    }
    
    const pairCount = gameData.gameSettings.numPairs;
    const newCards = gameData.cards || generateCards(pairCount * 2);
    
    // 優先使用server傳來的遊戲時間，不使用localStorage或預設值
    const actualGameTime = gameData.gameTime || gameData.gameSettings.gameDuration;
    
    setGameState(prev => ({
      ...prev,
      cards: newCards,
      timeLeft: actualGameTime,
      status: 'playing'
    }));
    
    console.log('[GamePage] Initialized game with server settings - time:', actualGameTime, 'pairs:', pairCount);
  }, [generateCards]);

  useEffect(() => {
    if (!roomID) {
      console.error('Missing roomID');
      return;
    }
    
    if (!playerNickname || playerNickname === 'Player') {
      console.warn('Missing or default playerNickname, using fallback');
      // If we don't have a proper nickname, try to get it from localStorage or use a default
      const fallbackNickname = localStorage.getItem(`player_${roomID}`) || `Player_${Date.now()}`;
      console.log('Using fallback nickname:', fallbackNickname);
      // Store the fallback nickname for future use
      localStorage.setItem(`player_${roomID}`, fallbackNickname);
    }

    const wsManager = WebSocketManager.getInstance();
    
    // Determine the actual nickname to use
    const actualNickname = (!playerNickname || playerNickname === 'Player') 
      ? localStorage.getItem(`player_${roomID}`) || `Player_${Date.now()}`
      : playerNickname;
    
    // Connect or reuse existing connection
    wsManager.connect(roomID, actualNickname, isHost)
      .then(() => {
        console.log('WebSocket connection established in GamePage');
        
        // Add message handler for this component
        wsManager.addMessageHandler('gamePage', (message) => {
          console.log('[WEBSOCKET GamePage] Message from server: ', message);
          
          if (message.type === 'gameData') {
            console.log('Received game data on GamePage:', message);
            
            // 確保server傳來完整的遊戲設定
            if (!message.gameTime || !message.cards) {
              console.error('[GamePage] Incomplete game data from server:', message);
              return;
            }
            
            const gameData = {
              gameSettings: {
                numPairs: message.cards.length / 2,
                gameDuration: message.gameTime
              },
              cards: message.cards,
              gameTime: message.gameTime
            };
            initializeGameWithData(gameData);
          }
          
          if (message.type === 'scoreUpdate') {
            setGameState(prev => ({ ...prev, score: message.score }));
          }
          if (message.type === 'gameEnded') {
            setGameState(prev => ({ ...prev, status: 'ended' }));
          }
          if (message.type === 'timeLeft') {
            setGameState(prev => ({ ...prev, timeLeft: message.timeLeft }));
          }
          if (message.type === 'playerListUpdate') {
            // 處理玩家列表更新，計算當前玩家的排名
            const players = message.data || [];
            const nonHostPlayers = players.filter((player: any) => !player.isHost);
            const sortedPlayers = nonHostPlayers.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
            
            // 找到當前玩家的排名
            const currentPlayerIndex = sortedPlayers.findIndex((player: any) => player.nickname === actualNickname);
            const currentRank = currentPlayerIndex >= 0 ? currentPlayerIndex + 1 : 0;
            const totalPlayers = sortedPlayers.length;
            
            // 更新當前玩家的分數（如果服務器有更新的分數）
            const currentPlayerData = sortedPlayers.find((player: any) => player.nickname === actualNickname);
            const currentScore = currentPlayerData ? currentPlayerData.score || 0 : gameState.score;
            
            setGameState(prev => ({ 
              ...prev, 
              rank: currentRank,
              totalPlayers: totalPlayers,
              score: currentScore
            }));
          }
        });
      })
      .catch((error) => {
        console.error('[WEBSOCKET GamePage] WebSocket connection error:', error);
      });

    // Check if we have game data from localStorage (for cases where gameData arrived before this component mounted)
    const storedGameData = localStorage.getItem('currentGameData');
    if (storedGameData && waitingForGameData) {
      try {
        const parsedData = JSON.parse(storedGameData);
        console.log('Found stored game data:', parsedData);
        initializeGameWithData(parsedData);
        localStorage.removeItem('currentGameData'); // Clean up
        return;
      } catch (error) {
        console.error('Error parsing stored game data:', error);
      }
    }

    // 只有在收到完整的server設定時才初始化遊戲
    if (!waitingForGameData && gameSettings && gameSettings.numPairs) {
      const pairCount = gameSettings.numPairs;
      const newCards = generateCards(pairCount * 2);
      setGameState(prev => ({ ...prev, cards: newCards }));
      console.log('[GamePage] Initialized with server settings - pairs:', pairCount);
    }

    // Cleanup function - remove message handler but don't disconnect during game
    return () => {
      const wsManager = WebSocketManager.getInstance();
      wsManager.removeMessageHandler('gamePage');
      
      // Don't disconnect during game - let WebSocketManager handle this
      console.log('GamePage component unmounting, message handler removed');
    };
  }, [roomID, gameSettings, playerNickname, isHost, waitingForGameData, generateCards, gameState.score, initializeGameWithData]);

  // Listen for gameDataReceived event from GameRoom
  useEffect(() => {
    const handleGameDataReceived = (event: CustomEvent) => {
      console.log('GamePage received gameDataReceived event:', event.detail);
      initializeGameWithData(event.detail);
    };

    window.addEventListener('gameDataReceived', handleGameDataReceived as EventListener);

    return () => {
      window.removeEventListener('gameDataReceived', handleGameDataReceived as EventListener);
    };
  }, [initializeGameWithData]);

  useEffect(() => {
    // 只有在收到完整的server設定時才初始化遊戲，不使用預設值
    if (gameSettings && gameSettings.numPairs) {
      const pairCount = gameSettings.numPairs;
      const newCards = generateCards(pairCount * 2);
      setGameState(prev => ({ ...prev, cards: newCards }));
      console.log('[GamePage] Game initialized with server settings - pairs:', pairCount);
    } else {
      console.log('[GamePage] Waiting for server settings, not initializing with defaults');
    }
  }, [gameSettings, generateCards]);

  useEffect(() => {
    if (gameState.timeLeft === 0 && gameState.status === 'playing') {
      // 播放遊戲結束音效
      soundEffects.gameOver();
      setGameState(prev => ({ ...prev, status: 'ended' }));
      const wsManager = WebSocketManager.getInstance();
      const message = { type: 'gameOver', roomID, nickname: playerNickname };
      wsManager.send(message);
    }
    if (gameState.timeLeft > 0 && gameState.status === 'playing') {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.timeLeft, gameState.status, roomID, playerNickname]);

  // 處理卡牌點擊
  const handleCardClick = (cardId: number) => {
    if (gameState.status !== 'playing') return;

    setGameState(prev => {
      const cards = [...prev.cards];
      const clickedCard = cards.find(card => card.id === cardId);
      const flippedCards = cards.filter(card => card.isFlipped && !card.isMatched);

      if (!clickedCard || clickedCard.isMatched || clickedCard.isFlipped || flippedCards.length >= 2) {
        return prev;
      }

      clickedCard.isFlipped = true;
      // 播放翻牌音效
      soundEffects.flip();

      if (flippedCards.length === 1) {
        if (flippedCards[0].value === clickedCard.value) {
          // 配對成功
          flippedCards[0].isMatched = true;
          clickedCard.isMatched = true;
          // 播放配對成功音效
          soundEffects.match();
          
          const newScore = prev.score + 10;
          // 發送分數更新到服務器
          const wsManager = WebSocketManager.getInstance();
          const message = { 
            type: 'flipCard', 
            roomID, 
            nickname: playerNickname, 
            score: newScore, 
            cardValue: clickedCard.value, 
            cardId: clickedCard.id 
          };
          wsManager.send(message);

          // 檢查是否所有卡牌都已配對
          const allMatched = cards.every(card => card.isMatched);
          if (allMatched) {
            // 播放遊戲結束音效
            setTimeout(() => soundEffects.gameOver(), 300);
            const wsManager = WebSocketManager.getInstance();
            const message = { 
              type: 'gameOver', 
              roomID, 
              nickname: playerNickname, 
              allPairsFound: true 
            };
            wsManager.send(message);
            return { ...prev, cards, score: newScore, status: 'ended' };
          }

          return { ...prev, cards, score: newScore };
        }

        // 配對失敗，延遲翻回
        // 播放配對失敗音效
        setTimeout(() => soundEffects.mismatch(), 500);
        setTimeout(() => {
          setGameState(prev => {
            const cards = [...prev.cards];
            cards.forEach(card => {
              if (!card.isMatched) card.isFlipped = false;
            });
            return { ...prev, cards };
          });
        }, 1000);
      }

      return { ...prev, cards };
    });
  };

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (gameState.cards.length === 0) {
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          載入遊戲中...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {gameState.status === 'waiting' ? (
            <Fade in={true}>
              <Box sx={{ textAlign: 'center', color: 'primary.main' }}>
                等待遊戲開始...
              </Box>
            </Fade>
          ) : (
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>記憶卡牌遊戲 - 房間 {roomID}</span>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="h6" color="secondary">
                  分數: {gameState.score}
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatTime(gameState.timeLeft)}
                </Typography>
              </Box>
            </Box>
          )}
        </Typography>

        {gameState.status === 'ended' && (
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
        )}

        {(gameState.status === 'playing' || gameState.status === 'ended') && (
          <Grid container spacing={2}>
            {gameState.cards.map(card => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={card.id}>
                <MuiCard
                  sx={{
                    cursor: gameState.status === 'playing' ? 'pointer' : 'default',
                    height: '100px',
                    width: '80px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: card.isMatched ? '#e8f5e9' : '#fff',
                    transform: card.isFlipped ? 'rotateY(180deg)' : 'none',
                    transition: 'transform 0.6s',
                    opacity: gameState.status === 'ended' ? 0.8 : 1,
                  }}
                  onClick={() => gameState.status === 'playing' && handleCardClick(card.id)}
                >
                  <CardContent
                    sx={{
                      transform: card.isFlipped ? 'rotateY(180deg)' : 'none',
                      transition: 'transform 0.6s',
                    }}
                  >
                    {card.isFlipped || card.isMatched ? (
                      <Box
                        sx={{
                          width: '100%',
                          height: '80px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={card.value}
                          alt="撲克牌"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '4px',
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '80px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src="/assets/images/cards/back.png"
                          alt="牌背"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            borderRadius: '4px',
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </MuiCard>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default GamePage;