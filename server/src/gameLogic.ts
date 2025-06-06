import { Card, Room } from './types';

/**
 * Generate a shuffled deck of cards for the memory game
 * @param numPairs Number of card pairs to generate
 * @returns Array of shuffled cards
 */
export function generateCards(numPairs: number): Card[] {
    const cards: Card[] = [];
    const values = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'];
    
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
    room.gameStarted = false;
    room.gameEnded = true;
    if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
    }
    broadcastToRoom(room, { type: 'gameEnded', reason });
    sendPlayerListUpdate(room, broadcastToRoom);
    // Optionally, reset room state for a new game or close connections
    // For now, we'll just mark it as ended. Players might want to see final scores.
}