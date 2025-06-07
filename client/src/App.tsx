import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
// Platform/System pages
import { Home, GameList, Login, Register } from './platform';

// Game-related pages
import { GameRoom, HostGameMonitor, WaitingRoom, CreateGame, JoinGame } from './games';
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
            <Route path="/creategame" element={<CreateGame />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:roomId" element={<JoinGame />} />
            <Route path="/room/:roomId" element={<GameRoom />} />
            <Route path="/gameroom/:roomId" element={<GameRoom />} />
            <Route path="/game/:roomId" element={<GamePage />} />
            <Route path="/host-monitor/:roomId" element={<HostGameMonitor />} />
            <Route path="/waitingroom/:roomId" element={<WaitingRoom />} />
        </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;