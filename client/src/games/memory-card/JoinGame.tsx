import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WebSocketManager from '../../utils/WebSocketManager';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  CircularProgress,
} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

const JoinGame = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const ws = useRef<WebSocket | null>(null);

  console.log('JoinGame initial isJoining:', isJoining);

  // Cleanup WebSocket connection when component unmounts (only if not navigating to game room)
  useEffect(() => {
    return () => {
      const wsManager = WebSocketManager.getInstance();
      // Only disconnect if we're not connected to any room or game is not active
      // This prevents disconnection when navigating from JoinGame to GameRoom
      if (!wsManager.isConnected() || (!wsManager.isGameActive() && !wsManager.getGameState().roomId)) {
        console.log('Cleaning up WebSocket connection for JoinGame');
        wsManager.disconnect();
      } else {
        console.log('Keeping WebSocket connection for room transition');
      }
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleJoin triggered');
    if (!nickname.trim()) {
      setError('請輸入暱稱');
      return;
    }

    setIsJoining(true);
    console.log('setIsJoining(true) called');
    setError('');

    // Use WebSocket manager to establish connection
    const wsManager = WebSocketManager.getInstance();
    
    wsManager.connect(roomId!, nickname, false)
      .then((websocket) => {
        console.log('WebSocket connection established in JoinGame');
        ws.current = websocket;
        setIsJoining(false);
        
        // Navigate to game page
        navigate(`/game/${roomId}`, {
          state: {
            playerNickname: nickname,
            isHost: false
          }
        });
      })
      .catch((error) => {
        console.error('Failed to connect:', error);
        
        // Handle room conflict error
        if (error.message === 'Game is active in different room') {
          console.log('[JoinGame] Resetting game state due to room conflict');
          wsManager.setGameActive(false);
          setError('正在重置連接狀態，請重試...');
          
          // Retry after resetting
          setTimeout(() => {
            setError('');
            setIsJoining(false);
          }, 2000);
        } else {
          setError('連接失敗，請重試');
          setIsJoining(false);
        }
      });

  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          <SportsEsportsIcon
            sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
          />
          <Typography variant="h5" component="h1" gutterBottom>
            加入遊戲
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            房間號碼：{roomId}
          </Typography>

          <Box component="form" onSubmit={handleJoin} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="你的暱稱"
              variant="outlined"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              error={!!error}
              helperText={error}
              disabled={isJoining}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isJoining}
              onClick={() => console.log('Button clicked')}
              sx={{ py: 1.5 }}
            >
              {isJoining ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '加入遊戲'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default JoinGame;