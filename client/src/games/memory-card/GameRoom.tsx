import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import WebSocketManager from '../../utils/WebSocketManager';
import {
    Container, Typography, Button, Box, Grid, Paper, List, ListItem, ListItemText, CircularProgress
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { styled } from '@mui/material/styles';
import Avatar from '../../components/Avatar';

interface Player {
    id: string;
    nickname: string;
    score: number;
    rank?: number;
    isHost?: boolean;
    avatar?: string;
}

const TopPlayerListItem = styled(ListItem)(({ theme }) => ({
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    '&:hover': {
        backgroundColor: theme.palette.success.main,
    },
}));

function GameRoom() {
    // ... existing code ...
    // 更新中文文本
    const gameRoomTitleText = (roomId: string | undefined) => `遊戲室: ${roomId}`;
    const invitePlayersText = "邀請玩家:";
    const scanOrShareLinkText = (url: string) => <>掃描或分享鏈接: <a href={url} target="_blank" rel="noopener noreferrer">{url}</a></>;
    const waitingForHostText = "等待房主開始遊戲...";
    const finalRankingsText = "最終排名:";
    const currentScoresText = "目前得分:";
    const youText = " (你)";
    const gameOverText = "遊戲結束!";
    const returnToHomeText = "返回首頁";
    const playersInRoomText = (count: number) => `房間內的玩家 (${count}):`;
    const noOtherPlayersText = "尚無其他玩家加入。";
    const testAloneText = "你可以單獨開始遊戲進行測試。";
    const { roomId } = useParams<{ roomId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const isHostFromState = location.state?.isHost || false;
    
    // Get playerNickname from multiple sources with fallback
    const getPlayerNickname = () => {
        // First try from navigation state
        if (location.state?.playerNickname) {
            return location.state.playerNickname;
        }
        if (location.state?.nickname) {
            return location.state.nickname;
        }
        // For hosts, try to get from WebSocketManager or use 'Host' as fallback
        if (isHostFromState) {
            const wsManager = WebSocketManager.getInstance();
            const gameState = wsManager.getGameState();
            return gameState.playerNickname || 'Host';
        }
        // Try to get from WebSocketManager for non-hosts
        const wsManager = WebSocketManager.getInstance();
        const gameState = wsManager.getGameState();
        return gameState.playerNickname || '';
    };

    const [playerNickname, setPlayerNickname] = useState<string>(getPlayerNickname());
    const [isHost] = useState<boolean>(isHostFromState);
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [gameEnded, setGameEnded] = useState<boolean>(false);
    const [showQR, setShowQR] = useState<boolean>(true);
    const ws = useRef<WebSocket | null>(null);

    // 遊戲設定已移除，相關 state 不再需要
    // const [numPairs, setNumPairs] = useState<string>('8');
    // const [duration, setDuration] = useState<string>('60');
    const [gameSettings, setGameSettings] = useState<any>(null);

    useEffect(() => {
        // Try to get playerNickname again if it's missing
        if (!playerNickname) {
            const updatedNickname = getPlayerNickname();
            if (updatedNickname) {
                setPlayerNickname(updatedNickname);
            }
        }
        
        if (!roomId || !playerNickname) {
            console.warn('Room ID or Nickname is missing, redirecting appropriately.', roomId, playerNickname);
            if (!roomId) {
                // If roomId is missing, redirect to home page
                navigate('/');
            } else {
                // If only nickname is missing but roomId exists, redirect to join page with roomId
                navigate(`/join/${roomId}`);
            }
            return;
        }

        // 讀取遊戲設定
        if (isHost && roomId) {
            const storedSettings = localStorage.getItem(`game_${roomId}`);
            if (storedSettings) {
                const settings = JSON.parse(storedSettings);
                setGameSettings(settings);
                console.log('Loaded game settings:', settings);
            }
        }

        const wsManager = WebSocketManager.getInstance();
        
        // Connect or reuse existing connection
        wsManager.connect(roomId, playerNickname, isHost)
            .then((websocket) => {
                console.log('WebSocket connection established in GameRoom');
                ws.current = websocket;
                setShowQR(isHost);
                
                // Join message is already sent by WebSocketManager in onopen handler
                
                // Add message handler for this component
                wsManager.addMessageHandler('gameRoom', (message) => {
                    console.log('Received message:', message);

                    if (message.type === 'playerListUpdate') {
                        // Extract players from message.data.players
                        const playersData = message.data && Array.isArray(message.data.players) ? message.data.players : [];
                        console.log('Setting players:', playersData);
                        setPlayers(playersData);
                        // Update room state based on server response
                        if (message.waitingForPlayers !== undefined) {
                            console.log('Room waiting for players:', message.waitingForPlayers);
                        }
                        if (message.gameStarted !== undefined) {
                            setGameStarted(message.gameStarted);
                        }
                        if (message.gameEnded !== undefined) {
                            setGameEnded(message.gameEnded);
                        }
                    } else if (message.type === 'status') {
                        console.log('Status message:', message.data);
                        if (message.data.startsWith("Error: Nickname") || message.data.startsWith("Error: Host already exists")){
                            alert(message.data);
                            navigate('/join');
                        }
                    } else if (message.type === 'gameStarted') {
                        console.log('Game started notification received:', message);
                        setGameStarted(true);
                        
                        // Navigate players based on their role (without game data yet)
                        if (!isHost) {
                            console.log('Non-host player navigating to game page and sending ready confirmation');
                            navigate(`/game/${roomId}`, {
                                state: {
                                    playerNickname: playerNickname,
                                    roomId: roomId,
                                    isHost: isHost,
                                    waitingForGameData: true // Flag to indicate waiting for game data
                                }
                            });
                            
                            // Send playerReady confirmation after navigation
                             setTimeout(() => {
                                 const readyMessage = {
                                     type: 'playerReady'
                                 };
                                 wsManager.send(readyMessage);
                                 console.log('Sent playerReady confirmation:', readyMessage);
                             }, 100); // Small delay to ensure navigation completes
                        } else {
                            console.log('Host navigating to game monitor');
                            navigate(`/host-monitor/${roomId}`, {
                                state: {
                                    playerNickname: playerNickname,
                                    roomId: roomId,
                                    isHost: isHost,
                                    waitingForGameData: true
                                }
                            });
                        }
                    } else if (message.type === 'gameData') {
                        console.log('Game data received:', message);
                        // This message contains the actual game parameters
                        const receivedGameSettings = {
                            numPairs: message.cards ? message.cards.length / 2 : 8,
                            gameDuration: message.gameTime || 60
                        };
                        console.log('Game settings set:', receivedGameSettings);
                        
                        // Store game data in localStorage for the game page to access
                        localStorage.setItem('currentGameData', JSON.stringify({
                            gameSettings: receivedGameSettings,
                            cards: message.cards,
                            gameTime: message.gameTime
                        }));
                        
                        // Broadcast game data received event for game page to pick up
                        window.dispatchEvent(new CustomEvent('gameDataReceived', {
                            detail: {
                                gameSettings: receivedGameSettings,
                                cards: message.cards,
                                gameTime: message.gameTime
                            }
                        }));
                        
                    } else if (message.type === 'gameEnded') {
                        setGameEnded(true);
                        if (message.data && message.data.players) {
                            setPlayers(message.data.players);
                        }
                    } else if (message.type === 'scoreUpdate') {
                        // Update player score in real-time
                        setPlayers(prevPlayers => 
                            prevPlayers.map(player => 
                                player.nickname === message.nickname 
                                    ? { ...player, score: message.score }
                                    : player
                            )
                        );
                        console.log(`Score updated for ${message.nickname}: ${message.score}`);
                    } else if (message.type === 'roomStateUpdate') {
                        // Handle room state updates
                        console.log('Room state update received:', message);
                        if (message.waitingForPlayers !== undefined) {
                            console.log('Room state updated - waiting for players:', message.waitingForPlayers);
                        }
                        if (message.gameStarted !== undefined) {
                            setGameStarted(message.gameStarted);
                        }
                        if (message.gameEnded !== undefined) {
                            setGameEnded(message.gameEnded);
                        }
                    }
                });
            })
            .catch((error) => {
                console.error('[WEBSOCKET] GameRoom connection error:', error);
                
                // If error is due to active game in different room, reset game state
                if (error.message === 'Game is active in different room') {
                    console.log('[GameRoom] Resetting game state due to room conflict');
                    wsManager.setGameActive(false);
                    // Retry connection after resetting game state
                    setTimeout(() => {
                        wsManager.connect(roomId, playerNickname, isHost)
                            .then((websocket) => {
                                console.log('WebSocket reconnected after game state reset');
                                ws.current = websocket;
                                setShowQR(isHost);
                            })
                            .catch((retryError) => {
                                console.error('[WEBSOCKET] Retry connection failed:', retryError);
                            });
                    }, 1000);
                }
            });



        // Cleanup function - remove message handler but don't disconnect during game
        return () => {
            const wsManager = WebSocketManager.getInstance();
            wsManager.removeMessageHandler('gameRoom');
            
            // If game is not actually active (no players or game not started), reset state
            if (!gameStarted && players.length === 0) {
                console.log('[GameRoom] Resetting game state on unmount - no active game');
                wsManager.setGameActive(false);
            }
            
            console.log('GameRoom component unmounting, message handler removed');
        };
    }, [roomId, playerNickname, isHost, navigate]);

    // Remove the non-host navigation logic as host now directly enters GameRoom
    // useEffect(() => {
    //     if (gameStarted && !isHost && roomId && ws.current && ws.current.readyState === WebSocket.OPEN) {
    //         console.log('Navigating non-host to game page. Data:', { cards, timeLeft, gameInfo, playerNickname });
    //         if (cards && cards.length > 0 && timeLeft > 0 && gameInfo) {
    //             navigate(`/game/${roomId}`, {
    //                 state: {
    //                     cards: cards,
    //                     timeLeft: timeLeft,
    //                     gameSettings: gameInfo,
    //                     playerNickname: playerNickname,
    //                     roomId: roomId,
    //                     isHost: false
    //                 }
    //             });
    //         } else {
    //             console.warn('Cannot navigate: game data not fully available for non-host.', 
    //                 { gameStarted, isHost, cardsLength: cards?.length, timeLeft, gameInfo });
    //         }
    //     }
    // }, [gameStarted, isHost, navigate, roomId, cards, timeLeft, gameInfo, playerNickname]);
 
    const startGame = () => {
        const wsManager = WebSocketManager.getInstance();
        
        // 使用從 CreateGame 傳來的設定，如果沒有則使用預設值
        const numPairs = gameSettings ? Math.floor(gameSettings.cardCount / 2) : 8;
        const gameDuration = gameSettings ? gameSettings.duration * 60 : 60; // 轉換分鐘為秒
        
        // Send hostStartGame message to backend
        const message = {
            type: 'hostStartGame',
            numPairs: numPairs,
            gameTime: gameDuration
        };
        wsManager.send(message);
        console.log('Sent hostStartGame message with settings:', message, 'Original settings:', gameSettings);
    };

    // Removed automatic navigation to game page
    // Players will navigate when they manually click "Start Game" button
 
    // Time countdown logic removed as requested
    
    // Card generation logic moved to GamePage.tsx


    // Removed connection status display as requested

    const joinUrl = `${window.location.origin}/join/${roomId}`;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={8}> {/* Main content area */} 
                    <Typography variant="h4" gutterBottom align="center">
                        {gameRoomTitleText(roomId)}
                    </Typography>

                    {showQR && (
                        <Box textAlign="center" my={2}>
                            <Typography variant="h6">{invitePlayersText}</Typography>
                            <QRCodeSVG value={joinUrl} size={128} level="H" />
                            <Typography variant="body1" mt={1}>{scanOrShareLinkText(joinUrl)}</Typography>
                        </Box>
                    )}

                    {!gameStarted && (
                        <Box textAlign="center" mt={4}>
                            {isHost ? (
                                <Box component="form" noValidate autoComplete="off" sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}>
                                    <Button 
                                        variant="contained" 
                                        color="primary" 
                                        onClick={startGame}
                                        sx={{ mt: 2 }}
                                        disabled={players.length === 0}
                                    >
                                        開始遊戲
                                    </Button>
                                    {players.length === 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{mt:1}}>{testAloneText}</Typography>}
                                </Box>
                            ) : (
                                <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '20vh'}}>
                                    <CircularProgress sx={{mb: 2}}/>
                                    <Typography variant="h6">{waitingForHostText}</Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {gameStarted && (
                        <Box textAlign="center" mt={2}>
                            <Typography variant="h5">遊戲準備開始</Typography>
                            <Typography variant="body1" sx={{mt: 2}}>等待玩家們進入記憶卡片遊戲...</Typography>
                        </Box>
                    )}
                    
                    {(gameEnded || (isHost && gameStarted)) && players.length > 0 && (
                        <Box mt={4}>
                            <Typography variant="h6" align="center">{gameEnded ? finalRankingsText : currentScoresText}</Typography>
                            <List sx={{ maxWidth: 400, margin: 'auto', backgroundColor: 'background.paper' }}>
                                {players.filter(player => !player.isHost).sort((a, b) => (b.score || 0) - (a.score || 0)).map((player, index) => (
                                player.nickname === playerNickname ? (
                                    <TopPlayerListItem key={player.id || player.nickname}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar avatar={player.avatar || 'cat'} size={32} />
                                            <ListItemText primary={`${index + 1}. ${player.nickname}${youText}: ${player.score || 0}`} />
                                        </Box>
                                    </TopPlayerListItem>
                                ) : (
                                    <ListItem key={player.id || player.nickname}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar avatar={player.avatar || 'cat'} size={32} />
                                            <ListItemText primary={`${index + 1}. ${player.nickname}: ${player.score || 0}`} />
                                        </Box>
                                    </ListItem>
                                )
                            ))}
                            </List>
                        </Box>
                    )}

                    {gameEnded && (
                         <Box textAlign="center" mt={4}>
                            <Typography variant="h4" color="secondary">{gameOverText}</Typography>
                            <Button variant="contained" onClick={() => navigate('/')} sx={{mt: 2}}>{returnToHomeText}</Button>
                        </Box>
                    )}
                </Grid>

                <Grid item xs={12} md={4}> {/* Player list/ranking area */} 
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        {gameStarted ? (
                            // 遊戲開始後顯示即時排名
                            <>
                                <Typography variant="h6">玩家即時排名</Typography>
                                {players.filter(p => !p.isHost).length > 0 ? (
                                    <List dense>
                                        {players
                                            .filter(p => !p.isHost)
                                            .sort((a, b) => (b.score || 0) - (a.score || 0))
                                            .map((p, index) => (
                                            <ListItem key={p.id || p.nickname} sx={{
                                                backgroundColor: p.nickname === playerNickname ? 'primary.light' : 'transparent',
                                                borderRadius: 1,
                                                mb: 0.5
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                    <Avatar avatar={p.avatar || 'cat'} size={32} />
                                                    <ListItemText 
                                                        primary={`${index + 1}. ${p.nickname}${p.nickname === playerNickname ? youText : ''}`}
                                                        secondary={`得分: ${p.score || 0}`}
                                                    />
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body1">暫無排名數據</Typography>
                                )}
                            </>
                        ) : (
                            // 遊戲開始前顯示玩家列表
                            <>
                                <Typography variant="h6">{playersInRoomText(players.filter(p => !p.isHost).length)}</Typography>
                                {players.filter(p => !p.isHost).length > 0 ? (
                                    <List dense>
                                        {players.filter(p => !p.isHost).map((p) => (
                                            <ListItem key={p.id || p.nickname}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar avatar={p.avatar || 'cat'} size={32} />
                                                    <ListItemText primary={`${p.nickname}${p.nickname === playerNickname ? youText : ''}`} />
                                                </Box>
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography variant="body1">{noOtherPlayersText}</Typography>
                                )}
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}

export default GameRoom;
