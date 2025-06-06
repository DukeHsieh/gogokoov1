import { Request, Response } from 'express';
import { rooms } from './roomManager';

/**
 * Get the player list for a specific room
 * @param req Express request object
 * @param res Express response object
 */
export function getPlayerList(req: Request, res: Response): void {
    const roomId = req.params.roomId;
    const room = rooms.get(roomId);
    
    console.log(`[API] Getting player list for room ${roomId}`);
    
    if (!room) {
        res.json({ players: [] });
        return;
    }
    
    const players: any[] = [];
    
    // Add host if exists
    if (room.hostClient) {
        players.push({
            nickname: room.hostClient.nickname,
            id: room.hostClient.ws.url,
            isHost: true,
            score: room.hostClient.score,
        });
    }
    
    // Add regular clients
    room.clients.forEach((client) => {
        players.push({
            nickname: client.nickname,
            id: client.ws.url,
            isHost: false,
            score: client.score,
        });
    });
    
    res.json({ 
        players,
        waitingForPlayers: room.waitingForPlayers,
        gameStarted: room.gameStarted,
        gameEnded: room.gameEnded
    });
}