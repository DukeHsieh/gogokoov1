import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Box,
  keyframes,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// 吉卜力風格動畫
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(1deg); }
  50% { transform: translateY(-5px) rotate(0deg); }
  75% { transform: translateY(-15px) rotate(-1deg); }
`;

const sparkleAnimation = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const bounceAnimation = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
`;

// 吉卜力風格容器
const GhibliContainer = styled(Container)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    #87CEEB 0%, 
    #98FB98 25%, 
    #F0E68C 50%, 
    #DDA0DD 75%, 
    #FFB6C1 100%
  )`,
  minHeight: '100vh',
  padding: '2rem 1rem',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.1"><circle cx="20" cy="20" r="2" fill="%23fff"/><circle cx="80" cy="30" r="1.5" fill="%23fff"/><circle cx="60" cy="70" r="1" fill="%23fff"/><circle cx="30" cy="80" r="2.5" fill="%23fff"/><circle cx="90" cy="60" r="1" fill="%23fff"/></svg>')`,
    animation: `${sparkleAnimation} 3s ease-in-out infinite`,
    pointerEvents: 'none',
  },
}));

// 動物裝飾組件
const AnimalDecorations = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 0,
  '& .animal': {
    position: 'absolute',
    fontSize: '3rem',
    animation: `${floatAnimation} 6s ease-in-out infinite`,
    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
  },
  '& .animal:nth-of-type(1)': {
    top: '10%',
    left: '5%',
    animationDelay: '0s',
  },
  '& .animal:nth-of-type(2)': {
    top: '20%',
    right: '10%',
    animationDelay: '1s',
  },
  '& .animal:nth-of-type(3)': {
    bottom: '15%',
    left: '8%',
    animationDelay: '2s',
  },
  '& .animal:nth-of-type(4)': {
    bottom: '25%',
    right: '5%',
    animationDelay: '3s',
  },
  '& .animal:nth-of-type(5)': {
    top: '50%',
    left: '2%',
    animationDelay: '4s',
  },
  '& .animal:nth-of-type(6)': {
    top: '60%',
    right: '3%',
    animationDelay: '5s',
  },
}));

// 吉卜力風格標題
const GhibliTitle = styled(Typography)(({ theme }) => ({
  fontFamily: '"Comic Sans MS", "Microsoft JhengHei", sans-serif',
  fontWeight: 'bold',
  background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)',
  backgroundSize: '300% 300%',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textAlign: 'center',
  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
  animation: `${bounceAnimation} 2s ease-in-out infinite`,
  position: 'relative',
  zIndex: 1,
}));

// 吉卜力風格卡片
const GhibliCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  borderRadius: '20px',
  border: '3px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, rgba(255,182,193,0.1), rgba(173,216,230,0.1))',
    opacity: 0,
    transition: 'opacity 0.3s ease',
  },
  '&:hover': {
    transform: 'translateY(-10px) scale(1.02)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    '&::before': {
      opacity: 1,
    },
  },
}));

const games = [
  {
    id: 'memory-challenge',
    title: '記憶大考驗',
    description: '考驗參與者的記憶力，通過有趣的配對遊戲激發團隊互動。',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><defs><linearGradient id="memoryGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2300A389"/><stop offset="100%" stop-color="%2300C9A7"/></linearGradient></defs><rect width="200" height="140" fill="url(%23memoryGrad)" rx="15"/><g transform="translate(100,70)"><circle cx="-30" cy="-20" r="15" fill="%23fff" opacity="0.9"/><circle cx="30" cy="-20" r="15" fill="%23fff" opacity="0.9"/><circle cx="-30" cy="20" r="15" fill="%23fff" opacity="0.9"/><circle cx="30" cy="20" r="15" fill="%23fff" opacity="0.9"/><text x="-30" y="-15" font-family="Arial" font-size="12" fill="%2300A389" text-anchor="middle">?</text><text x="30" y="-15" font-family="Arial" font-size="12" fill="%2300A389" text-anchor="middle">?</text><text x="-30" y="25" font-family="Arial" font-size="12" fill="%2300A389" text-anchor="middle">?</text><text x="30" y="25" font-family="Arial" font-size="12" fill="%2300A389" text-anchor="middle">?</text></g><text x="100" y="120" font-family="Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">🧠 記憶挑戰</text></svg>',
    participants: '5-20人',
    duration: '15-30分鐘',
    animal: '🦉',
  },
  {
    id: 'red-envelope',
    title: '搶紅包大戰',
    description: '快速反應遊戲！搶奪從天而降的紅包，考驗你的手速和眼力。',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><defs><linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FF6B6B"/><stop offset="50%" stop-color="%23FF4757"/><stop offset="100%" stop-color="%23FF3742"/></linearGradient><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23FFD700"/><stop offset="100%" stop-color="%23FFA500"/></linearGradient></defs><rect width="200" height="140" fill="url(%23redGrad)" rx="15"/><g transform="translate(100,70)"><rect x="-25" y="-15" width="50" height="30" fill="url(%23goldGrad)" rx="5"/><rect x="-20" y="-10" width="40" height="20" fill="%23FF4757" rx="3"/><circle cx="0" cy="0" r="3" fill="%23FFD700"/><text x="0" y="3" font-family="Arial" font-size="8" fill="white" text-anchor="middle" font-weight="bold">福</text></g><g transform="translate(60,40)"><rect x="-12" y="-8" width="24" height="16" fill="url(%23goldGrad)" rx="3"/><rect x="-10" y="-6" width="20" height="12" fill="%23FF4757" rx="2"/></g><g transform="translate(140,100)"><rect x="-12" y="-8" width="24" height="16" fill="url(%23goldGrad)" rx="3"/><rect x="-10" y="-6" width="20" height="12" fill="%23FF4757" rx="2"/></g><text x="100" y="125" font-family="Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">🧧 搶紅包</text></svg>',
    participants: '3-15人',
    duration: '10-20分鐘',
    animal: '🐱',
  },
  {
    id: 'whack-a-mole',
    title: '打地鼠大作戰',
    description: '快速反應遊戲！敲打從洞裡冒出來的地鼠，考驗你的反應速度和準確度。',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><defs><linearGradient id="moleGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2332CD32"/><stop offset="50%" stop-color="%2328A745"/><stop offset="100%" stop-color="%23228B22"/></linearGradient><radialGradient id="holeGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23654321"/><stop offset="100%" stop-color="%232F1B14"/></radialGradient></defs><rect width="200" height="140" fill="url(%23moleGrad)" rx="15"/><ellipse cx="60" cy="90" rx="15" ry="8" fill="url(%23holeGrad)"/><ellipse cx="100" cy="70" rx="15" ry="8" fill="url(%23holeGrad)"/><ellipse cx="140" cy="90" rx="15" ry="8" fill="url(%23holeGrad)"/><g transform="translate(100,65)"><ellipse cx="0" cy="5" rx="8" ry="6" fill="%23D2691E"/><circle cx="0" cy="0" r="6" fill="%23F4A460"/><circle cx="-2" cy="-2" r="1" fill="%23000"/><circle cx="2" cy="-2" r="1" fill="%23000"/><ellipse cx="0" cy="1" rx="1" ry="0.5" fill="%23000"/><path d="M-3,-1 Q0,-3 3,-1" stroke="%23000" stroke-width="0.5" fill="none"/></g><text x="100" y="125" font-family="Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">🔨 打地鼠</text></svg>',
    participants: '3-20人',
    duration: '5-15分鐘',
    animal: '🐹',
  },
  {
    id: 'coming-soon-1',
    title: '神秘遊戲',
    description: '更多精彩遊戲即將登場，敬請期待！',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><defs><linearGradient id="mysteryGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23667eea"/><stop offset="100%" stop-color="%23764ba2"/></linearGradient></defs><rect width="200" height="140" fill="url(%23mysteryGrad)" rx="15"/><g transform="translate(100,70)"><circle cx="0" cy="0" r="30" fill="none" stroke="white" stroke-width="3" opacity="0.6" stroke-dasharray="5,5"/><text x="0" y="5" font-family="Arial" font-size="24" fill="white" text-anchor="middle">?</text></g><text x="100" y="125" font-family="Arial" font-size="14" fill="white" text-anchor="middle" font-weight="bold">🔮 即將推出</text></svg>',
    participants: '-',
    duration: '-',
    animal: '🦋',
  },
];

const GameList = () => {
  const navigate = useNavigate();

  const handleGameClick = (gameId: string) => {
    switch (gameId) {
      case 'memory-challenge':
        navigate('/creategame');
        break;
      case 'red-envelope':
        // 導航到搶紅包遊戲創建頁面
        navigate('/games/red-envelope/create');
        break;
      case 'whack-a-mole':
        // 生成房間ID並直接跳轉到打地鼠遊戲設定頁面
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        navigate(`/games/whack-a-mole/settings/${roomId}`);
        break;
      case 'coming-soon-1':
        // 即將推出的遊戲不做任何操作
        break;
      default:
        navigate(`/games/${gameId}`);
    }
  };

  return (
    <GhibliContainer maxWidth="lg">
      {/* 動物裝飾 */}
      <AnimalDecorations>
        <div className="animal">🐰</div>
        <div className="animal">🦊</div>
        <div className="animal">🐻</div>
        <div className="animal">🐼</div>
        <div className="animal">🐸</div>
        <div className="animal">🦔</div>
      </AnimalDecorations>

      <GhibliTitle
        variant="h3"
        sx={{ mb: 6 }}
      >
        🎮 魔法遊戲世界 🎮
      </GhibliTitle>

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4}>
          {games.map((game) => (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <GhibliCard
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: game.id === 'coming-soon-1' ? 0.7 : 1,
                  cursor: game.id === 'coming-soon-1' ? 'default' : 'pointer',
                }}
              >
                <CardActionArea
                  disabled={game.id === 'coming-soon-1'}
                  onClick={() => handleGameClick(game.id)}
                  sx={{ 
                    height: '100%',
                    '&:hover': {
                      '& .game-animal': {
                        transform: 'scale(1.2) rotate(10deg)',
                      },
                    },
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={game.image}
                      alt={game.title}
                      sx={{
                        borderRadius: '15px 15px 0 0',
                      }}
                    />
                    {/* 遊戲專屬動物圖標 */}
                    <Box
                      className="game-animal"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: '2rem',
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      {game.animal}
                    </Box>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Typography 
                      gutterBottom 
                      variant="h6" 
                      component="h2"
                      sx={{
                        fontFamily: '"Comic Sans MS", "Microsoft JhengHei", sans-serif',
                        fontWeight: 'bold',
                        color: '#2C3E50',
                        mb: 2,
                      }}
                    >
                      {game.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ 
                        mb: 3,
                        color: '#5D6D7E',
                        lineHeight: 1.6,
                        fontFamily: '"Microsoft JhengHei", sans-serif',
                      }}
                    >
                      {game.description}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 'auto',
                        p: 2,
                        background: 'linear-gradient(45deg, rgba(255,182,193,0.2), rgba(173,216,230,0.2))',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        sx={{
                          color: '#34495E',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        👥 {game.participants}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{
                          color: '#34495E',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        ⏱️ {game.duration}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </GhibliCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    </GhibliContainer>
  );
};

export default GameList;