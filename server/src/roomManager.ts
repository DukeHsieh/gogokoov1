import WebSocket from 'ws';
import { Room, Client } from './types';

// Global rooms storage
export const rooms = new Map<string, Room>();

/**
 * Create a new room with the given ID
 * @param roomId The ID for the new room
 * @returns The created room
 */
export function createRoom(roomId: string): Room {
    const room: Room = {
        id: roomId,
        hostClient: null,
        clients: new Map<WebSocket, Client>(),
        cards: [],
        gameTime: 0,
        totalPlayers: 0,
        playersReady: new Map<string, boolean>(),
        waitingForPlayers: true,
        gameStarted: false,
        gameEnded: false,
        timer: null
    };
    
    rooms.set(roomId, room);
    console.log(`[ROOM ${roomId}] Room created.`);
    return room;
}

/**
 * Get a room by ID, create if it doesn't exist
 * @param roomId The room ID to get or create
 * @returns The room
 */
export function getOrCreateRoom(roomId: string): Room {
    let room = rooms.get(roomId);
    if (!room) {
        room = createRoom(roomId);
    }
    return room;
}

/**
 * Register a client as the host of a room
 * @param room The room to register the host in
 * @param client The client to register as host
 */
export function registerHost(room: Room, client: Client): void {
    if (room.hostClient) {
        console.log(`[ROOM ${room.id}] Host already exists: ${room.hostClient.nickname}. Replacing with ${client.nickname}.`);
    }
    room.hostClient = client;
    client.isHost = true;
    console.log(`[ROOM ${room.id}] Host client ${client.nickname} registered.`);
}

/**
 * Register a regular client in a room
 * @param room The room to register the client in
 * @param client The client to register
 * @param ws The WebSocket connection
 */
export function registerClient(room: Room, client: Client, ws: WebSocket): void {
    room.clients.set(ws, client);
    client.isHost = false;
    console.log(`[ROOM ${room.id}] Client ${client.nickname} registered. (Total clients: ${room.clients.size})`);
}

/**
 * Handle client reconnection
 * @param room The room the client is reconnecting to
 * @param client The reconnecting client
 * @param ws The new WebSocket connection
 * @returns True if reconnection was handled, false otherwise
 */
export function handleReconnection(room: Room, client: Client, ws: WebSocket): boolean {
    // Check if this is a reconnecting host
    if (room.hostClient && room.hostClient.nickname === client.nickname) {
        console.log(`[ROOM ${room.id}] Host ${client.nickname} is reconnecting.`);
        room.hostClient.ws = ws; // Update the WebSocket connection
        client.isHost = true;
        return true;
    }
    
    // Check if this is a reconnecting regular client
    for (const [existingWs, existingClient] of room.clients.entries()) {
        if (existingClient.nickname === client.nickname) {
            console.log(`[ROOM ${room.id}] Client ${client.nickname} is reconnecting.`);
            // Remove old connection and add new one
            room.clients.delete(existingWs);
            room.clients.set(ws, client);
            client.isHost = false;
            client.score = existingClient.score; // Preserve score
            return true;
        }
    }
    
    return false;
}

/**
 * Send player list update to all clients in a room
 * @param room The room to send updates to
 * @param broadcastToRoom Function to broadcast messages to room
 */
export function sendPlayerListUpdate(
    room: Room, 
    broadcastToRoom: (room: Room, message: any) => void
): void {
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

/**
 * Broadcast a message to all clients in a room
 * @param room The room to broadcast to
 * @param message The message to broadcast
 */
export function broadcastToRoom(room: Room, message: any): void {
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

/**
 * Remove a room from the rooms map
 * @param roomId The ID of the room to remove
 */
export function removeRoom(roomId: string): void {
    const room = rooms.get(roomId);
    if (room) {
        if (room.timer) {
            clearTimeout(room.timer);
        }
        rooms.delete(roomId);
        console.log(`[ROOM ${roomId}] Room removed.`);
    }
}