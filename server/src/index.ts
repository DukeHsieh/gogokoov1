import express from 'express';
import path from 'path';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 提供React build文件的靜態服務
app.use(express.static(path.join(__dirname, '../../client/build')));

// API endpoint to get player list for a room
app.get('/api/room/:roomId/players', (req, res) => {
    const roomId = req.params.roomId;
    const room = rooms.get(roomId);
    
    if (!room) {
        // Return empty data instead of 404 when room doesn't exist
        console.log(`[API] Room ${roomId} not found, returning empty player list`);
        return res.json({
            players: [],
            waitingForPlayers: true,
            gameStarted: false,
            gameEnded: true,
        });
    }
    
    const players: any[] = [];
    
    // 只返回一般玩家資料，不包含主持人
    console.log(`[API] Returning player list for room ${roomId} (${room.clients.size} players)`);
    room.clients.forEach((client) => {
        players.push({
            nickname: client.nickname,
            id: client.ws.url,
            isHost: client.isHost,
            score: client.score,
        });
    });
    
    res.json({
        players,
        waitingForPlayers: room.waitingForPlayers,
        gameStarted: room.gameStarted,
        gameEnded: room.gameEnded,
    });
});

const server = http.createServer(app);
// 创建WebSocket服务器实例并将其附加到HTTP服务器
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 80;

interface Card {
    id: number;
    value: string;
}

interface Client {
    ws: WebSocket; // 使用导入的 WebSocket 类型
    roomId: string;
    nickname: string;
    isHost: boolean;
    score: number;
}

interface Room {
    id: string;
    clients: Map<WebSocket, Client>;
    hostClient: Client | null;
    // broadcast: (message: any) => void; // This will be handled by wss
    waitingForPlayers: boolean;
    gameStarted: boolean;
    gameEnded: boolean;
    cards: Card[];
    gameTime: number;
    timer: NodeJS.Timeout | null;
    playersReady: Map<string, boolean>;
    totalPlayers: number;
}

const rooms = new Map<string, Room>();

// Function to generate cards (similar to Go version)
function generateCards(numPairs: number): Card[] {
    console.log(`[GAME] Generating ${numPairs} pairs of cards`);
    const pokerSuits = ['♠', '♥', '♦', '♣'];
    const pokerValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    const cards: Card[] = [];
    let cardId = 0;

    for (let i = 0; i < numPairs; i++) {
        const suit = pokerSuits[i % pokerSuits.length];
        const value = pokerValues[i % pokerValues.length];
        const cardValue = suit + value;

        cards.push({ id: cardId++, value: cardValue });
        cards.push({ id: cardId++, value: cardValue });
    }

    // Shuffle the cards
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    console.log(`[GAME] Generated and shuffled ${cards.length} cards`);
    return cards;
}


wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url?.split('?')[1] || '');
    const roomId = params.get('roomId');
    const nickname = params.get('nickname') || (params.get('isHost') === 'true' ? 'Host' : '');
    const isHost = params.get('isHost') === 'true';

    if (!roomId) {
        console.log('[WEBSOCKET] roomId is required');
        ws.close();
        return;
    }

    if (!isHost && !nickname) {
        console.log('[WEBSOCKET] nickname is required for non-host players');
        ws.close();
        return;
    }

    console.log(`[WEBSOCKET] Client connected: ${nickname} (isHost: ${isHost}) to room: ${roomId}`);

    let room = rooms.get(roomId);
    if (!room) {
        console.log(`[ROOM] Room ${roomId} not found, creating new room.`);
        room = {
            id: roomId,
            clients: new Map<WebSocket, Client>(),
            hostClient: null,
            waitingForPlayers: true,
            gameStarted: false,
            gameEnded: false,
            cards: [],
            gameTime: 0,
            timer: null,
            playersReady: new Map<string, boolean>(),
            totalPlayers: 0,
        };
        rooms.set(roomId, room);
        console.log(`[ROOM] ✅ Room ${roomId} created and added to rooms map.`);
    }

    const client: Client = {
        ws,
        roomId,
        nickname,
        isHost,
        score: 0,
    };

    if (isHost) {
        if (room.hostClient) {
            console.log(`[ROOM ${roomId}] Host already exists. Closing new host connection.`);
            ws.send(JSON.stringify({ type: 'error', message: 'Host already exists in this room.' }));
            ws.close();
            return;
        }
        room.hostClient = client;
        console.log(`[ROOM ${roomId}] Host client registered: ${nickname}`);
    } else {
        // Check if a client with the same nickname already exists
        let existingClientWs: WebSocket | undefined;
        for (const [existingWs, existingClient] of room.clients.entries()) {
            if (existingClient.nickname === nickname) {
                existingClientWs = existingWs;
                break;
            }
        }

        if (existingClientWs) {
            // If client with same nickname exists, remove old entry and add new one
            room.clients.delete(existingClientWs);
            console.log(`[ROOM ${roomId}] Client ${nickname} reconnected. Updating WebSocket.`);
        }
        room.clients.set(ws, client);
        console.log(`[ROOM ${roomId}] Client registered: ${nickname} (Total clients: ${room.clients.size})`);
    }

    sendPlayerListUpdate(room);

    ws.on('message', (message) => {
        console.log(`[WEBSOCKET] Received message from ${client.nickname} in room ${client.roomId}: ${message}`);
        try {
            const messageStr = message.toString();
            console.log(`[DEBUG] Message string:`, messageStr);
            const msg = JSON.parse(messageStr);
            console.log(`[DEBUG] Parsed message:`, msg);
            handleMessage(client, room!, msg);
        } catch (error) {
            console.error(`[WEBSOCKET] Error parsing message from ${client.nickname}:`, error);
        }
    });

    ws.on('close', () => {
        console.log(`[WEBSOCKET] Client disconnected: ${client.nickname} from room ${client.roomId}`);
        if (client.isHost && room?.hostClient === client) {
            room.hostClient = null;
            console.log(`[ROOM ${client.roomId}] Host client ${client.nickname} unregistered.`);
            // If host disconnects, we might want to end the game or notify other players
            // if (room.gameStarted && !room.gameEnded) {
            //     endGame(room, "Host disconnected");
            // }
            console.log(`[ROOM ${client.roomId}] Host disconnected. Game active: ${room.gameStarted}, Game ended: ${room.gameEnded}. Not ending game immediately.`);
        } else {
            // Only remove client if this WebSocket is still the current one for this client
            const currentClient = room?.clients.get(ws);
            if (currentClient && currentClient === client) {
                room?.clients.delete(ws);
                console.log(`[ROOM ${client.roomId}] Client ${client.nickname} unregistered. (Total clients: ${room?.clients.size})`);
            } else {
                console.log(`[ROOM ${client.roomId}] Client ${client.nickname} connection closed, but newer connection exists. Not removing.`);
            }
        }
        if (room) {
            sendPlayerListUpdate(room);
            // Room will only be closed when host explicitly closes it
            // No automatic deletion when empty
        }
    });

    ws.on('error', (error) => {
        console.error(`[WEBSOCKET] Error for client ${client.nickname} in room ${client.roomId}:`, error);
        // Handle error, potentially remove client
        if (room) {
            if (client.isHost && room.hostClient === client) {
                // room.hostClient = null; // Commented out to prevent immediate host client nullification on disconnect
            } else {
                room.clients.delete(ws);
            }
            sendPlayerListUpdate(room);
        }
    });
});

function handleMessage(client: Client, room: Room, msg: any) {
    console.log(`[DEBUG] handleMessage called with msg:`, msg);
    console.log(`[DEBUG] msg.type:`, msg.type);
    switch (msg.type) {
        case 'join':
            // Nickname is already set on connection, this is more of a confirmation
            // Or could be used to update nickname if allowed
            console.log(`[JOIN] Player '${client.nickname}' confirmed join to room '${client.roomId}' (IsHost: ${client.isHost})`);
            sendPlayerListUpdate(room);
            break;
        case 'hostStartGame':
            if (client.isHost) {
                console.log(`[GAME ${room.id}] Host ${client.nickname} initiated game start.`);
                const numPairs = parseInt(msg.numPairs, 10);
                const gameTime = parseInt(msg.gameTime, 10);

                if (isNaN(numPairs) || isNaN(gameTime) || numPairs <= 0 || gameTime <= 0) {
                    console.log(`[GAME ${room.id}] Invalid hostStartGame message: numPairs or gameTime missing/invalid`);
                    client.ws.send(JSON.stringify({ type: 'error', message: 'Invalid game parameters.'}));
                    break;
                }

                if (room.gameStarted) {
                    console.log(`[GAME ${room.id}] Game already started, ignoring start request.`);
                    client.ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress.'}));
                    break;
                }
                if (!room.waitingForPlayers) {
                    console.log(`[GAME ${room.id}] Room not in waiting state, ignoring start request.`);
                     client.ws.send(JSON.stringify({ type: 'error', message: 'Room not in waiting state.'}));
                    break;
                }

                room.cards = generateCards(numPairs);
                room.gameTime = gameTime;
                room.totalPlayers = room.clients.size; // Count non-host players
                room.playersReady = new Map<string, boolean>();

                room.waitingForPlayers = false;
                room.gameStarted = true;
                room.gameEnded = false;

                broadcastToRoom(room, { type: 'gameStarted' });
                broadcastToRoom(room, { type: 'gameData', cards: room.cards, gameTime: room.gameTime });
                sendPlayerListUpdate(room);

                if (room.timer) {
                    clearTimeout(room.timer);
                }
                room.timer = setTimeout(() => {
                    endGame(room, "Time's up!");
                }, room.gameTime * 1000);

                console.log(`[GAME ${room.id}] Game started with ${numPairs} pairs and ${gameTime} seconds.`);
            } else {
                console.log(`[GAME ${room.id}] Non-host client ${client.nickname} attempted to start game.`);
                client.ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start the game.'}));
            }
            break;
        case 'flipCard': // In the Go code, this was used to update score directly
            const score = parseInt(msg.score, 10);
            if (!isNaN(score)) {
                console.log(`......[GAME ${room.id}] Updating score for ${client.nickname} to ${score}`);
                client.score = score;
                console.log(`[GAME ${room.id}] Updated score for player ${client.nickname}: ${client.score}`);
                broadcastToRoom(room, { type: 'scoreUpdate', nickname: client.nickname, score: client.score });
                sendPlayerListUpdate(room); // To update rankings
            } else {
                console.log(`[GAME ${room.id}] Invalid score received for player ${client.nickname}: ${msg.score}`);
            }
            break;
        case 'hostCloseGame':
            if (client.isHost) {
                console.log(`[ROOM ${room.id}] Host ${client.nickname} is closing the game and room.`);
                // End the game if it's still running
                if (room.gameStarted && !room.gameEnded) {
                    endGame(room, "Host closed the game");
                }
                // Close the room
                console.log(`[ROOM ${room.id}] Room closed by host, removing.`);
                if (room.timer) clearTimeout(room.timer);
                rooms.delete(room.id);
                // Notify all clients that the room is closed
                broadcastToRoom(room, { type: 'roomClosed', reason: 'Host closed the game' });
            } else {
                console.log(`[ROOM ${room.id}] Non-host client ${client.nickname} attempted to close the game.`);
                client.ws.send(JSON.stringify({ type: 'error', message: 'Only the host can close the game.' }));
            }
            break;
        default:
            console.log(`[WEBSOCKET] Unhandled message type: ${msg.type} from ${client.nickname}`);
    }
}

function endGame(room: Room, reason: string) {
    if (!room.gameStarted || room.gameEnded) return; // Prevent multiple endGame calls

    console.log(`[GAME ${room.id}] Ending game. Reason: ${reason}`);
    room.gameStarted = false;
    room.gameEnded = true;
    if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
    }
    broadcastToRoom(room, { type: 'gameEnded', reason });
    sendPlayerListUpdate(room);
    // Optionally, reset room state for a new game or close connections
    // For now, we'll just mark it as ended. Players might want to see final scores.
}

function sendPlayerListUpdate(room: Room) {
    console.log(`[ROOM ${room.id}] Starting player list update...`);
    const players: any[] = [];

    room.clients.forEach((client) => {
        players.push({
            nickname: client.nickname,
            id: client.ws.url, // Using URL as a unique ID
            isHost: client.isHost,
            score: client.score,
        });
    });

    const payload = {
        type: 'playerListUpdate',
        data: players,
        waitingForPlayers: room.waitingForPlayers,
        gameStarted: room.gameStarted,
        gameEnded: room.gameEnded,
    };

    console.log(`[ROOM ${room.id}] Sending playerListUpdate payload:`, JSON.stringify(payload).substring(0, 200) + '...');
    broadcastToRoom(room, payload);
}

function broadcastToRoom(room: Room, message: any) {
    const messageString = JSON.stringify(message);
    console.log(`[ROOM ${room.id}] Broadcasting message to ${room.clients.size + (room.hostClient ? 1: 0)} clients: ${messageString.substring(0,100)}`);

    if (room.hostClient && room.hostClient.ws.readyState === WebSocket.OPEN) {
        try {
            room.hostClient.ws.send(messageString);
        } catch (e) {
            console.error(`[WEBSOCKET] Error sending to host ${room.hostClient.nickname}:`, e);
        }
    }
    room.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(messageString);
            } catch (e) {
                console.error(`[WEBSOCKET] Error sending to client ${client.nickname}:`, e);
            }
        }
    });
}

// 所有非API路由都返回React應用
app.use((req, res, next) => {
    // 如果請求不是API路由，返回React應用
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../../client/build/index.html'));
    } else {
        next();
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Basic error handling for the server itself
server.on('error', (error) => {
    console.error('Server error:', error);
});