import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import WebSocketManager from '../../utils/WebSocketManager';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="stars" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23ffffff" opacity="0.3"/></pattern></defs><rect width="100" height="100" fill="url(%23stars)"/></svg>');
    animation: ${float} 20s ease-in-out infinite;
  }
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
  animation: ${fadeIn} 1s ease-out;
`;

const Title = styled.h1`
  color: white;
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  font-family: 'Georgia', serif;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  margin-bottom: 3rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
`;

const AnimalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  max-width: 800px;
  margin: 0 auto 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
`;

const AnimalCard = styled.div<{ delay: number }>`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease;
  animation: ${fadeIn} 1s ease-out ${(props: { delay: number }) => props.delay}s both,
             ${float} 4s ease-in-out infinite ${(props: { delay: number }) => props.delay * 0.5}s;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  img {
    width: 100%;
    height: auto;
    max-width: 150px;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  }
`;

const StatusText = styled.div`
  color: white;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const LoadingDots = styled.span`
  &::after {
    content: '...';
    animation: ${pulse} 1.5s infinite;
  }
`;

const RoomInfo = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  h3 {
    color: white;
    margin: 0 0 0.5rem 0;
    font-size: 1.3rem;
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-size: 1rem;
  }
`;

interface WaitingRoomProps {}

const WaitingRoom: React.FC<WaitingRoomProps> = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [playerCount, setPlayerCount] = useState(1);
  const [roomName, setRoomName] = useState('遊戲房間');
  const [currentGameState, setCurrentGameState] = useState<{
    gameType: string | null;
    roomId: string | null;
    isInGame: boolean;
  }>({ gameType: null, roomId: null, isInGame: false });
  
  // 從路由狀態中獲取玩家信息
  const { isHost = false, playerNickname = '玩家' } = location.state || {};

  const animals = [
    { name: 'sleeping-totoro', alt: '睡覺的龍貓' },
    { name: 'sleeping-cat', alt: '睡覺的貓咪' },
    { name: 'sleeping-rabbit', alt: '睡覺的兔子' },
    { name: 'sleeping-fox', alt: '睡覺的狐狸' },
    { name: 'sleeping-bear', alt: '睡覺的熊' },
    { name: 'sleeping-owl', alt: '睡覺的貓頭鷹' },
    { name: 'sleeping-squirrel', alt: '睡覺的松鼠' },
    { name: 'sleeping-hedgehog', alt: '睡覺的刺蝟' }
  ];

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    console.log(`WaitingRoom mounted for Room ID: ${roomId}, Is Host: ${isHost}, Nickname: ${playerNickname}`);

    // 註冊platform handler來處理等待室的消息
    const wsManager = WebSocketManager.getInstance();
    
    // 檢查 WebSocketManager 的遊戲狀態，確保狀態同步
    const wsGameState = wsManager.getGameState();
    if (wsGameState.isGameActive && wsGameState.roomId === roomId) {
      console.log('[WaitingRoom] 檢測到已有活躍遊戲狀態，同步本地狀態', {
        gameType: wsGameState.gameType,
        roomId: wsGameState.roomId
      });
      setCurrentGameState({
        gameType: wsGameState.gameType,
        roomId: wsGameState.roomId,
        isInGame: true
      });
    }
    
    wsManager.addMessageHandler('waiting-room-platform', (message) => {
      console.log('[WaitingRoom Platform Handler] Received message:', message);
      
      switch (message.type) {
        case 'platformPlayerUpdate':
        case 'playerUpdate':
        case 'playerListUpdate':
          if (message.data) {
            setPlayerCount(message.data.playerCount || message.playerCount || 1);
            setRoomName(message.data.roomName || message.roomName || '遊戲房間');
          }
          break;
        case 'platformGameStarted':
          console.log('Game starting...', message);
          
          const gameType = message.data?.gameType || message.gameType;
          const gameData = message.data?.gameData || message.gameData;
          
          // 檢查是否已經在同一個遊戲中
          if (currentGameState.isInGame && 
              currentGameState.gameType === gameType && 
              currentGameState.roomId === roomId) {
            console.log(`[WaitingRoom] 已經擋下重複進入 - 玩家已在遊戲中:`, {
              currentGameType: currentGameState.gameType,
              newGameType: gameType,
              roomId: roomId,
              playerNickname: playerNickname
            });
            return;
          }
          
          // 更新目前遊戲狀態
          setCurrentGameState({
            gameType: gameType,
            roomId: roomId,
            isInGame: true
          });
          
          console.log(`[WaitingRoom] 進入遊戲:`, {
            gameType: gameType,
            roomId: roomId,
            playerNickname: playerNickname,
            isHost: isHost,
            gameData: gameData
          });
          
          // 移除所有game handlers
          wsManager.removeAllGameHandlers();
          
          if (gameType === 'memory') {
            navigate(`/game/${roomId}`, {
              state: { 
                playerNickname, 
                isHost, 
                gameData: gameData,
                gameSettings: gameData?.gameSettings 
              }
            });
          } else if (gameType === 'redenvelope') {
            if (isHost) {
              navigate(`/games/red-envelope/host/${roomId}`, {
                state: { 
                  playerNickname, 
                  isHost, 
                  gameData: gameData,
                  gameSettings: gameData?.gameSettings 
                }
              });
            } else {
              navigate(`/games/red-envelope/game/${roomId}`, {
                state: { 
                  playerNickname, 
                  isHost, 
                  gameData: gameData,
                  gameSettings: gameData?.gameSettings 
                }
              });
            }
          } else {
            // 預設導向記憶卡遊戲
            console.warn('Unknown game type:', gameType, 'defaulting to memory game');
            navigate(`/game/${roomId}`, {
              state: { 
                playerNickname, 
                isHost, 
                gameData: gameData,
                gameSettings: gameData?.gameSettings 
              }
            });
          }
          break;
        default:
          console.log('Unhandled waiting room message:', message.type);
          break;
      }
    }, 'platform');

    return () => {
      // 清理platform handler
      wsManager.removeMessageHandler('waiting-room-platform', 'platform');
      // 重置遊戲狀態
      setCurrentGameState({ gameType: null, roomId: null, isInGame: false });
    };
  }, [roomId, navigate, isHost, playerNickname]);

  return (
    <Container>
      <ContentWrapper>
        <Title>夢境等待室</Title>
        <Subtitle>所有的小動物都在安靜地等待著...</Subtitle>
        
        <RoomInfo>
          <h3>房間 #{roomId}</h3>
          <p>{roomName} • {playerCount} 位玩家</p>
          <p>歡迎 {playerNickname}！</p>
        </RoomInfo>

        <StatusText>
          等待遊戲開始
          <LoadingDots />
        </StatusText>

        <AnimalsGrid>
          {animals.map((animal, index) => (
            <AnimalCard key={animal.name} delay={index * 0.2}>
              <img 
                src={`/assets/images/waiting/${animal.name}.svg`} 
                alt={animal.alt}
              />
            </AnimalCard>
          ))}
        </AnimalsGrid>
      </ContentWrapper>
    </Container>
  );
};

export default WaitingRoom;