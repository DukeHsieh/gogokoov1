import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const games = [
  {
    id: 'memory-challenge',
    title: '記憶大考驗',
    description: '考驗參與者的記憶力，通過有趣的配對遊戲激發團隊互動。',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2300A389"/><text x="50" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dy=".3em">記憶大考驗</text></svg>',
    participants: '5-20人',
    duration: '15-30分鐘',
  },
  {
    id: 'coming-soon-1',
    title: '即將推出',
    description: '更多精彩遊戲即將登場，敬請期待！',
    image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23cccccc"/><text x="50" y="50" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dy=".3em">即將推出</text></svg>',
    participants: '-',
    duration: '-',
  },
];

const GameList = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Typography
        variant="h4"
        component="h1"
        sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}
      >
        可用遊戲
      </Typography>

      <Grid container spacing={3}>
        {games.map((game) => (
          <Grid item xs={12} sm={6} md={4} key={game.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: '0.3s',
                '&:hover': {
                  transform: game.id !== 'coming-soon-1' ? 'translateY(-4px)' : 'none',
                  boxShadow: game.id !== 'coming-soon-1' ? 3 : 1,
                },
              }}
            >
              <CardActionArea
                disabled={game.id === 'coming-soon-1'}
                onClick={() => game.id === 'memory-challenge' ? navigate('/creategame') : (game.id !== 'coming-soon-1' && navigate(`/games/${game.id}`))}
                sx={{ height: '100%' }}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={game.image}
                  alt={game.title}
                  sx={{
                    bgcolor: game.id === 'coming-soon-1' ? 'grey.300' : 'primary.main',
                  }}
                />
                <CardContent>
                  <Typography gutterBottom variant="h6" component="h2">
                    {game.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {game.description}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mt: 'auto',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      👥 {game.participants}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ⏱️ {game.duration}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default GameList;