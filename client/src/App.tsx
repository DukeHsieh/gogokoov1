import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
// Platform/System pages
import { Home, GameList, Login, Register, CreateRoom, GameRoom as PlatformGameRoom, JoinGame as PlatformJoinGame, WaitingRoom as PlatformWaitingRoom } from './platform';

// Game-related pages
import { HostGameMonitor, CreateGame, JoinGame } from './games';
import { GamePage } from './games/memory-card';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00A389', // Slido-like green color
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<GameList />} />
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/creategame" element={<CreateGame />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:roomId" element={<PlatformJoinGame />} />

            <Route path="/gameroom/:roomId" element={<PlatformGameRoom />} />
            <Route path="/game/:roomId" element={<GamePage />} />
            <Route path="/games/memory-card/host/:roomId" element={<HostGameMonitor />} />
            <Route path="/host-monitor/:roomId" element={<HostGameMonitor />} />
            <Route path="/platform-waiting/:roomId" element={<PlatformWaitingRoom />} />
        </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;