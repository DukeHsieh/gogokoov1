import { Client, Room } from './types';
import { generateCards, endGame } from './gameLogic';
import { broadcastToRoom, sendPlayerListUpdate, removeRoom } from './roomManager';

/**
 * Handle incoming WebSocket messages from clients
 * @param client The client that sent the message
 * @param room The room the client is in
 * @param msg The message object
 */
export function handleMessage(client: Client, room: Room, msg: any): void {
    console.log(`[DEBUG] handleMessage called with msg:`, msg);
    console.log(`[DEBUG] msg.type:`, msg.type);
    
    switch (msg.type) {
        case 'join':
            handleJoinMessage(client, room);
            break;
            
        case 'hostStartGame':
            handleHostStartGame(client, room, msg);
            break;
            
        case 'flipCard':
            handleFlipCard(client, room, msg);
            break;
            
        case 'hostCloseGame':
            handleHostCloseGame(client, room);
            break;
            
        default:
            console.log(`[WEBSOCKET] Unhandled message type: ${msg.type} from ${client.nickname}`);
    }
}

/**
 * Handle join message
 * @param client The client joining
 * @param room The room being joined
 */
function handleJoinMessage(client: Client, room: Room): void {
    // Nickname is already set on connection, this is more of a confirmation
    // Or could be used to update nickname if allowed
    console.log(`[JOIN] Player '${client.nickname}' confirmed join to room '${client.roomId}' (IsHost: ${client.isHost})`);
    sendPlayerListUpdate(room, broadcastToRoom);
}

/**
 * Handle host start game message
 * @param client The host client
 * @param room The room to start the game in
 * @param msg The message containing game parameters
 */
function handleHostStartGame(client: Client, room: Room, msg: any): void {
    if (!client.isHost) {
        console.log(`[GAME ${room.id}] Non-host client ${client.nickname} attempted to start game.`);
        client.ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start the game.'}));
        return;
    }
    
    console.log(`[GAME ${room.id}] Host ${client.nickname} initiated game start.`);
    const numPairs = parseInt(msg.numPairs, 10);
    const gameTime = parseInt(msg.gameTime, 10);

    if (isNaN(numPairs) || isNaN(gameTime) || numPairs <= 0 || gameTime <= 0) {
        console.log(`[GAME ${room.id}] Invalid hostStartGame message: numPairs or gameTime missing/invalid`);
        client.ws.send(JSON.stringify({ type: 'error', message: 'Invalid game parameters.'}));
        return;
    }

    if (room.gameStarted) {
        console.log(`[GAME ${room.id}] Game already started, ignoring start request.`);
        client.ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress.'}));
        return;
    }
    
    if (!room.waitingForPlayers) {
        console.log(`[GAME ${room.id}] Room not in waiting state, ignoring start request.`);
        client.ws.send(JSON.stringify({ type: 'error', message: 'Room not in waiting state.'}));
        return;
    }

    // Initialize game state
    room.cards = generateCards(numPairs);
    room.gameTime = gameTime;
    room.totalPlayers = room.clients.size; // Count non-host players
    room.playersReady = new Map<string, boolean>();

    room.waitingForPlayers = false;
    room.gameStarted = true;
    room.gameEnded = false;

    // Broadcast game start
    broadcastToRoom(room, { type: 'gameStarted' });
    broadcastToRoom(room, { type: 'gameData', cards: room.cards, gameTime: room.gameTime });
    sendPlayerListUpdate(room, broadcastToRoom);

    // Set game timer
    if (room.timer) {
        clearTimeout(room.timer);
    }
    room.timer = setTimeout(() => {
        endGame(room, "Time's up!", broadcastToRoom, sendPlayerListUpdate);
    }, room.gameTime * 1000);

    console.log(`[GAME ${room.id}] Game started with ${numPairs} pairs and ${gameTime} seconds.`);
}

/**
 * Handle flip card message (score update)
 * @param client The client flipping the card
 * @param room The room the client is in
 * @param msg The message containing score data
 */
function handleFlipCard(client: Client, room: Room, msg: any): void {
    const score = parseInt(msg.score, 10);
    if (!isNaN(score)) {
        console.log(`......[GAME ${room.id}] Updating score for ${client.nickname} to ${score}`);
        client.score = score;
        console.log(`[GAME ${room.id}] Updated score for player ${client.nickname}: ${client.score}`);
        broadcastToRoom(room, { type: 'scoreUpdate', nickname: client.nickname, score: client.score });
        sendPlayerListUpdate(room, broadcastToRoom); // To update rankings
    } else {
        console.log(`[GAME ${room.id}] Invalid score received for player ${client.nickname}: ${msg.score}`);
    }
}

/**
 * Handle host close game message
 * @param client The host client
 * @param room The room to close
 */
function handleHostCloseGame(client: Client, room: Room): void {
    if (!client.isHost) {
        console.log(`[ROOM ${room.id}] Non-host client ${client.nickname} attempted to close the game.`);
        client.ws.send(JSON.stringify({ type: 'error', message: 'Only the host can close the game.' }));
        return;
    }
    
    console.log(`[ROOM ${room.id}] Host ${client.nickname} is closing the game and room.`);
    
    // End the game if it's still running
    if (room.gameStarted && !room.gameEnded) {
        endGame(room, "Host closed the game", broadcastToRoom, sendPlayerListUpdate);
    }
    
    // Notify all clients that the room is closed
    broadcastToRoom(room, { type: 'roomClosed', reason: 'Host closed the game' });
    
    // Close the room
    console.log(`[ROOM ${room.id}] Room closed by host, removing.`);
    removeRoom(room.id);
}