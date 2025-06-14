import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
// Platform/System pages
import { Home, Login, Register } from './platform';
// 从各个独立文件中导入组件
import CreateRoom from './platform/host/CreateRoom';
import GameList from './platform/host/GameList';
import GameRoom from './platform/host/GameRoom';
import { JoinGame as PlatformJoinGame, WaitingRoom as PlatformWaitingRoom } from './platform/player';

// Game-related pages
import { HostGameMonitor, CreateGame } from './games';
import { GamePage } from './games/memory-card';
import { CreateRedEnvelopeGame, HostGameMonitor as RedEnvelopeHostGameMonitor } from './games/red-envelope';
import GameControl from './games/red-envelope/player/GameControl';
import { WhackAMoleHost, WhackAMoleGame, GameSettings, HostMonitor } from './games/whack-a-mole';

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
            <Route path="/games/red-envelope/create" element={<CreateRedEnvelopeGame />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:roomId" element={<PlatformJoinGame />} />

            <Route path="/gameroom/:roomId" element={<GameRoom />} />
            <Route path="/game/:roomId" element={<GamePage />} />
            <Route path="/games/memory-card/host/:roomId" element={<HostGameMonitor />} />
            <Route path="/games/red-envelope/host/:roomId" element={<RedEnvelopeHostGameMonitor />} />
            <Route path="/games/red-envelope/game/:roomId" element={<GameControl />} />
            <Route path="/games/whack-a-mole/host/:roomId" element={<WhackAMoleHost />} />
            <Route path="/games/whack-a-mole/settings/:roomId" element={<GameSettings />} />
            <Route path="/games/whack-a-mole/monitor/:roomId" element={<HostMonitor />} />
            <Route path="/games/whack-a-mole/game/:roomId" element={<WhackAMoleGame />} />
            <Route path="/host-monitor/:roomId" element={<HostGameMonitor />} />
            <Route path="/platform-waiting/:roomId" element={<PlatformWaitingRoom />} />
        </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;