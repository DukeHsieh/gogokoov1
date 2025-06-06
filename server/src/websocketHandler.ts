import WebSocket from 'ws';
import { Client } from './types';
import { getOrCreateRoom, registerHost, registerClient, handleReconnection, sendPlayerListUpdate, broadcastToRoom } from './roomManager';
import { handleMessage } from './messageHandler';

/**
 * Handle new WebSocket connections
 * @param ws The WebSocket connection
 * @param request The HTTP request that initiated the WebSocket connection
 */
export function handleWebSocketConnection(ws: WebSocket, request: any): void {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const roomId = url.searchParams.get('roomId') || 'default';
    const nickname = url.searchParams.get('nickname') || 'Anonymous';
    const isHost = url.searchParams.get('isHost') === 'true';

    console.log(`[WEBSOCKET] New connection: ${nickname} joining room ${roomId} (IsHost: ${isHost})`);

    const room = getOrCreateRoom(roomId);
    const client: Client = {
        ws,
        nickname,
        roomId,
        isHost: false, // Will be set properly below
        score: 0,
        gameFinished: false
    };

    // Handle reconnection or new connection
    const isReconnection = handleReconnection(room, client, ws);
    
    if (!isReconnection) {
        if (isHost) {
            registerHost(room, client);
        } else {
            registerClient(room, client, ws);
        }
    }

    // Send initial player list update
    sendPlayerListUpdate(room, broadcastToRoom);

    // Set up WebSocket event handlers
    setupWebSocketEventHandlers(ws, client, room);
}

/**
 * Set up event handlers for a WebSocket connection
 * @param ws The WebSocket connection
 * @param client The client associated with the connection
 * @param room The room the client is in
 */
function setupWebSocketEventHandlers(ws: WebSocket, client: Client, room: any): void {
    // Handle incoming messages
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`[WEBSOCKET] Message from ${client.nickname}:`, msg);
            handleMessage(client, room!, msg);
        } catch (error) {
            console.error(`[WEBSOCKET] Error parsing message from ${client.nickname}:`, error);
        }
    });

    // Handle connection close
    ws.on('close', () => {
        handleClientDisconnection(client, room);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
        handleWebSocketError(client, room, error);
    });
}

/**
 * Handle client disconnection
 * @param client The disconnecting client
 * @param room The room the client was in
 */
function handleClientDisconnection(client: Client, room: any): void {
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
        const currentClient = room?.clients.get(client.ws);
        if (currentClient && currentClient === client) {
            room?.clients.delete(client.ws);
            console.log(`[ROOM ${client.roomId}] Client ${client.nickname} unregistered. (Total clients: ${room?.clients.size})`);
        } else {
            console.log(`[ROOM ${client.roomId}] Client ${client.nickname} connection closed, but newer connection exists. Not removing.`);
        }
    }
    
    if (room) {
        sendPlayerListUpdate(room, broadcastToRoom);
        // Room will only be closed when host explicitly closes it
        // No automatic deletion when empty
    }
}

/**
 * Handle WebSocket errors
 * @param client The client with the error
 * @param room The room the client is in
 * @param error The error that occurred
 */
function handleWebSocketError(client: Client, room: any, error: Error): void {
    console.error(`[WEBSOCKET] Error for client ${client.nickname} in room ${client.roomId}:`, error);
    
    // Handle error, potentially remove client
    if (room) {
        if (client.isHost && room.hostClient === client) {
            // room.hostClient = null; // Commented out to prevent immediate host client nullification on disconnect
        } else {
            room.clients.delete(client.ws);
        }
        sendPlayerListUpdate(room, broadcastToRoom);
    }
}