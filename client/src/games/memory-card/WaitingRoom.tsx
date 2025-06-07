import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import WebSocketManager from '../../utils/WebSocketManager';
import {
    Container, Typography, Button, Box, Grid, Paper, List, ListItem, ListItemText, CircularProgress, Alert
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import Avatar from '../../components/Avatar';

interface Player {
    id: string;
    nickname: string;
    score: number;
    rank?: number;
    isHost?: boolean;
    avatar?: string;
}

function WaitingRoom() {
    const { roomId } = useParams<{ roomId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const ws = useRef<WebSocket | null>(null);

    const isHost = location.state?.isHost || false;
    const playerNickname = isHost ? 'Host' : location.state?.playerNickname || '玩家'; // Host uses 'Host' as nickname, players use passed nickname or default

    const [players, setPlayers] = useState<Player[]>([]);
    const [isWsConnected, setIsWsConnected] = useState(false);

    const [connectionError, setConnectionError] = useState<string | null>(null);

    // 更新中文文本
    const connectingText = "連接到遊戲室...";
    const connectionIssueText = "如果您短時間內未連接，請檢查您的網絡或嘗試重新加入。";
    const returnToJoinPageText = "返回加入頁面";
    const gameRoomTitleText = (roomId: string | undefined) => `遊戲室: ${roomId}`;
    const invitePlayersText = "邀請玩家:";
    const scanOrShareLinkText = (url: string) => <>掃描或分享鏈接: <a href={url} target="_blank" rel="noopener noreferrer">{url}</a></>;
    const waitingForHostText = "等待房主開始遊戲...";
    const playersInRoomText = (count: number) => `房間內的玩家 (${count}):`;
    const youText = " (你)";
    const hostText = " (房主)";

    useEffect(() => {
        if (!roomId) {
            setConnectionError("無效的房間號碼。");
            return;
        }

        // 確保在組件卸載時關閉 WebSocket 連接
        return () => {
            const currentWs = ws.current;
            if (currentWs) {
                console.log('Closing WebSocket connection for WaitingRoom');
                currentWs.close();
            }
        };
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;

        const wsManager = WebSocketManager.getInstance();
        
        // Connect or reuse existing connection
        wsManager.connect(roomId, playerNickname, isHost)
            .then(() => {
                console.log('WebSocket connection established in WaitingRoom');
                setIsWsConnected(true);
                
                // Add message handler for this component
                wsManager.addMessageHandler('waitingRoom', (message) => {
                    console.log('Received message in WaitingRoom:', message);

                    if (message.type === 'playerListUpdate') {
                        setPlayers(message.data || []);
                    } else if (message.type === 'gameStarted') {
                        // 遊戲開始，非主持人玩家導航到遊戲頁面
                        console.log('Game started, navigating to game page');
                        if (!isHost) {
                            navigate(`/game/${roomId}`, { 
                                state: { 
                                    playerNickname: playerNickname, 
                                    isHost: isHost,
                                    waitingForGameData: true
                                } 
                            });
                        }
                    } else if (message.type === 'gameData') {
                        // 收到遊戲資料，表示遊戲已開始，導航到遊戲頁面
                        console.log('Game data received, navigating to game page');
                        navigate(`/game/${roomId}`, { 
                            state: { 
                                playerNickname: playerNickname, 
                                isHost: isHost,
                                gameSettings: {
                                    numPairs: message.cards ? message.cards.length / 2 : 6,
                                    duration: message.gameTime || 60
                                },
                                waitingForGameData: false
                            } 
                        });
                    } else if (message.type === 'status') {
                        console.log('Status message in WaitingRoom:', message.data);
                        if (message.data.startsWith("Error: Nickname") || message.data.startsWith("Error: Host already exists")){
                            alert(message.data);
                            navigate('/join');
                        }
                    }
                });
            })
            .catch((error) => {
                console.error('WebSocket connection error in WaitingRoom:', error);
                setConnectionError("WebSocket 連接錯誤，請檢查網絡或稍後再試。");
                setIsWsConnected(false);
            });

        // Cleanup function - only disconnect if game is not active
        return () => {
            const wsManager = WebSocketManager.getInstance();
            wsManager.removeMessageHandler('waitingRoom');
            
            if (!wsManager.isGameActive()) {
                console.log('Cleaning up WebSocket connection for WaitingRoom');
                wsManager.disconnect();
            }
        };
    }, [roomId, playerNickname, isHost, navigate]);

    const currentUrl = window.location.origin + `/join/${roomId}`;

    if (connectionError) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error">{connectionError}</Alert>
                <Button variant="contained" color="primary" onClick={() => navigate('/join')} sx={{ mt: 2 }}>
                    {returnToJoinPageText}
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {gameRoomTitleText(roomId)}
                </Typography>
                {!isWsConnected && (
                    <Box sx={{ my: 3 }}>
                        <CircularProgress />
                        <Typography variant="h6" sx={{ mt: 2 }}>{connectingText}</Typography>
                        <Typography variant="body2" color="text.secondary">{connectionIssueText}</Typography>
                    </Box>
                )}

                {isWsConnected && (
                    <Box>
                        {isHost && (
                            <Box sx={{ mb: 4 }}>
                                <Typography variant="h5" gutterBottom>{invitePlayersText}</Typography>
                                <Grid container spacing={2} justifyContent="center" alignItems="center">
                                    <Grid item>
                                        <QRCodeSVG value={currentUrl} size={128} level="H" />
                                    </Grid>
                                    <Grid item xs={12} sm={8}>
                                        <Paper variant="outlined" sx={{ p: 2, wordBreak: 'break-all' }}>
                                            <Typography variant="body1">
                                                {scanOrShareLinkText(currentUrl)}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        <Typography variant="h5" gutterBottom>{playersInRoomText(players.length)}</Typography>
                        <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper', margin: '0 auto' }}>
                            {players.map((player) => (
                                <ListItem key={player.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                        <Avatar avatar={player.avatar || 'cat'} size={40} />
                                        <ListItemText
                                            primary={
                                                <>
                                                    {player.nickname}
                                                    {/* Display (你) only if not host and nickname matches */}
                                                    {!isHost && player.nickname === playerNickname && youText}
                                                    {/* Display (房主) if the current client is the host AND this player entry is the host placeholder (if any) */}
                                                    {/* Server now filters out host from player list, so this might not be needed or needs adjustment based on how host is represented if at all */}
                                                    {player.isHost && hostText} {/* This might still be useful if server sends a host placeholder or for local rendering logic */}
                                                </>
                                            }
                                        />
                                    </Box>
                                </ListItem>
                            ))}
                        </List>

                        {!isHost && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" color="text.secondary">
                                    {waitingForHostText}
                                </Typography>
                            </Box>
                        )}

                        {isHost && ( // 房主可以開始遊戲
                            <Button
                                variant="contained"
                                color="primary"
                                size="large"
                                sx={{ mt: 4 }}
                                onClick={() => {
                                    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                                        ws.current.send(JSON.stringify({ type: 'startGame', payload: { roomId: roomId } }));
                                    }
                                }}
                            >
                                開始遊戲
                            </Button>
                        )}
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default WaitingRoom;