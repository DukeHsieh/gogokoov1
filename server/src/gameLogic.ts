import { Card, Room } from './types';

/**
 * Generate a shuffled deck of cards for the memory game
 * @param numPairs Number of card pairs to generate
 * @returns Array of shuffled cards
 */
export function generateCards(numPairs: number): Card[] {
    const cards: Card[] = [];
    const values = [
        '/assets/images/cards/heart_1.png',
        '/assets/images/cards/heart_2.png',
        '/assets/images/cards/heart_3.png',
        '/assets/images/cards/heart_4.png',
        '/assets/images/cards/heart_5.png',
        '/assets/images/cards/heart_6.png',
        '/assets/images/cards/heart_7.png',
        '/assets/images/cards/heart_8.png',
        '/assets/images/cards/heart_9.png',
        '/assets/images/cards/heart_10.png',
        '/assets/images/cards/heart_jack.png',
        '/assets/images/cards/heart_queen.png',
        '/assets/images/cards/heart_king.png',
        '/assets/images/cards/diamond_1.png',
        '/assets/images/cards/diamond_2.png',
        '/assets/images/cards/diamond_3.png',
        '/assets/images/cards/diamond_4.png',
        '/assets/images/cards/diamond_5.png',
        '/assets/images/cards/diamond_6.png',
        '/assets/images/cards/diamond_7.png',
        '/assets/images/cards/diamond_8.png',
        '/assets/images/cards/diamond_9.png',
        '/assets/images/cards/diamond_10.png',
        '/assets/images/cards/diamond_jack.png',
        '/assets/images/cards/diamond_queen.png',
        '/assets/images/cards/diamond_king.png',
        '/assets/images/cards/club_1.png',
        '/assets/images/cards/club_2.png',
        '/assets/images/cards/club_3.png',
        '/assets/images/cards/club_4.png',
        '/assets/images/cards/club_5.png',
        '/assets/images/cards/club_6.png',
        '/assets/images/cards/club_7.png',
        '/assets/images/cards/club_8.png',
        '/assets/images/cards/club_9.png',
        '/assets/images/cards/club_10.png',
        '/assets/images/cards/club_jack.png',
        '/assets/images/cards/club_queen.png',
        '/assets/images/cards/club_king.png',
        '/assets/images/cards/spade_1.png',
        '/assets/images/cards/spade_2.png',
        '/assets/images/cards/spade_3.png',
        '/assets/images/cards/spade_4.png',
        '/assets/images/cards/spade_5.png',
        '/assets/images/cards/spade_6.png',
        '/assets/images/cards/spade_7.png',
        '/assets/images/cards/spade_8.png',
        '/assets/images/cards/spade_9.png',
        '/assets/images/cards/spade_10.png',
        '/assets/images/cards/spade_jack.png',
        '/assets/images/cards/spade_queen.png',
        '/assets/images/cards/spade_king.png'
    ];
    
    // Take only the number of unique values we need
    const selectedValues = values.slice(0, numPairs);
    
    // Create pairs of cards
    for (let i = 0; i < selectedValues.length; i++) {
        const value = selectedValues[i];
        // Create two cards with the same value
        cards.push({
            id: i * 2,
            value: value,
            isFlipped: false,
            isMatched: false
        });
        cards.push({
            id: i * 2 + 1,
            value: value,
            isFlipped: false,
            isMatched: false
        });
    }
    
    // Shuffle the cards using Fisher-Yates algorithm
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    
    return cards;
}

/**
 * End the game for a room
 * @param room The room to end the game for
 * @param reason The reason for ending the game
 * @param broadcastToRoom Function to broadcast messages to room
 * @param sendPlayerListUpdate Function to send player list updates
 */
export function endGame(
    room: Room, 
    reason: string,
    broadcastToRoom: (room: Room, message: any) => void,
    sendPlayerListUpdate: (room: Room, broadcastToRoom: (room: Room, message: any) => void) => void
) {
    if (!room.gameStarted || room.gameEnded) return; // Prevent multiple endGame calls

    console.log(`[GAME ${room.id}] Ending game. Reason: ${reason}`);
    
    // Calculate final rankings
    const players = Array.from(room.clients.values())
        .filter(client => !client.isHost)
        .map(client => ({
            nickname: client.nickname,
            score: client.score || 0,
            finished: client.gameFinished || false
        }))
        .sort((a, b) => {
            // Sort by score (descending), then by finished status
            if (a.score !== b.score) return b.score - a.score;
            if (a.finished !== b.finished) return a.finished ? -1 : 1;
            return 0;
        });
    
    // Add rank to each player
    const finalResults = players.map((player, index) => ({
        ...player,
        rank: index + 1,
        totalPlayers: players.length
    }));
    
    room.gameStarted = false;
    room.gameEnded = true;
    if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
    }
    
    // Send final results to all players
    broadcastToRoom(room, { 
        type: 'gameEnded', 
        reason,
        finalResults: finalResults
    });
    
    console.log(`[GAME ${room.id}] Final results sent:`, finalResults);
    sendPlayerListUpdate(room, broadcastToRoom);
    // Optionally, reset room state for a new game or close connections
    // For now, we'll just mark it as ended. Players might want to see final scores.
}