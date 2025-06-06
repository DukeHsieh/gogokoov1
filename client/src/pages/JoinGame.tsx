import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WebSocketManager from '../utils/WebSocketManager';
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

  // Cleanup WebSocket connection when component unmounts (only if game is not active)
  useEffect(() => {
    return () => {
      const wsManager = WebSocketManager.getInstance();
      if (!wsManager.isGameActive()) {
        console.log('Cleaning up WebSocket connection for JoinGame');
        wsManager.disconnect();
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
        
        // Add message handler for this component
        wsManager.addMessageHandler('joinGame', (message) => {
          console.log('[WEBSOCKET JoinGame] Message from server: ', message);
          if (message.type === 'status' && message.status === 'connected') {
            console.log('[WEBSOCKET JoinGame] Successfully connected and recognized by server.');
          }
        });
        
        // Navigate to waiting room after successful connection
        navigate(`/waitingroom/${roomId}`, { state: { playerNickname: nickname } });
        setIsJoining(false);
        console.log('setIsJoining(false) called after navigation');
      })
      .catch((error) => {
        console.error('[WEBSOCKET JoinGame] WebSocket connection error:', error);
        setError('無法連接到遊戲伺服器，請稍後再試。');
        setIsJoining(false);
        console.log('setIsJoining(false) called on ws error');
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