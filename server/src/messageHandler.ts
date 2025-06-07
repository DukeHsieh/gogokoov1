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
            
        case 'cardClick':
            handleCardClick(client, room, msg);
            break;
            
        case 'flipCard':
            handleFlipCard(client, room, msg);
            break;
            
        case 'hostCloseGame':
            handleHostCloseGame(client, room);
            break;
            
        case 'gameOver':
            handleGameOver(client, room, msg);
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
    const cards = generateCards(numPairs);
    room.cards = cards;
    room.gameTime = gameTime;
    room.totalPlayers = room.clients.size; // Count non-host players
    room.playersReady = new Map<string, boolean>();
    
    // Initialize game data for card click handling
    room.gameData = {
        cards: cards,
        gameTime: gameTime,
        gameSettings: {
            numPairs: numPairs,
            gameDuration: gameTime
        }
    };
    room.flippedCards = [];

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
 * Handle card click message from player
 * @param client The client clicking the card
 * @param room The room the client is in
 * @param msg The message containing card click data
 */
function handleCardClick(client: Client, room: Room, msg: any): void {
    if (!room.gameStarted || room.gameEnded) {
        console.log(`[GAME ${room.id}] Card click ignored - game not active`);
        return;
    }

    const cardId = msg.cardId;
    if (cardId === undefined || cardId === null) {
        console.log(`[GAME ${room.id}] Invalid card ID received from ${client.nickname}`);
        return;
    }

    // Find the card in room's game data
    if (!room.gameData || !room.gameData.cards) {
        console.log(`[GAME ${room.id}] No game data available`);
        return;
    }

    const card = room.gameData.cards.find(c => c.id === cardId);
    if (!card) {
        console.log(`[GAME ${room.id}] Card with ID ${cardId} not found`);
        return;
    }

    // Check if card can be flipped
    if (card.isFlipped || card.isMatched) {
        console.log(`[GAME ${room.id}] Card ${cardId} already flipped or matched`);
        return;
    }

    // Initialize flipped cards tracking if not exists
    if (!room.flippedCards) {
        room.flippedCards = [];
    }

    // Check if player already has 2 cards flipped
    if (room.flippedCards.length >= 2) {
        console.log(`[GAME ${room.id}] Two cards already flipped, ignoring new click`);
        return;
    }

    // Flip the card
    card.isFlipped = true;
    room.flippedCards.push(cardId);
    
    console.log(`[GAME ${room.id}] Player ${client.nickname} flipped card ${cardId}`);
    
    // Broadcast card flip to all players
    broadcastToRoom(room, {
        type: 'cardFlipped',
        cardId: cardId,
        playerNickname: client.nickname
    });

    // Check if two cards are flipped
    if (room.flippedCards.length === 2) {
        const [firstCardId, secondCardId] = room.flippedCards;
        const firstCard = room.gameData.cards.find(c => c.id === firstCardId);
        const secondCard = room.gameData.cards.find(c => c.id === secondCardId);

        if (firstCard && secondCard) {
            // Check if cards match
            if (firstCard.value === secondCard.value) {
                // Cards match!
                firstCard.isMatched = true;
                secondCard.isMatched = true;
                
                // Update player score
                client.score = (client.score || 0) + 10;
                
                console.log(`[GAME ${room.id}] Cards matched! Player ${client.nickname} score: ${client.score}`);
                
                // Broadcast match to all players
                broadcastToRoom(room, {
                    type: 'cardsMatched',
                    cardIds: [firstCardId, secondCardId],
                    playerNickname: client.nickname
                });
                
                // Broadcast score update
                broadcastToRoom(room, {
                    type: 'scoreUpdate',
                    nickname: client.nickname,
                    score: client.score
                });
                
                // Check if all pairs are found
                const totalPairs = room.gameData.cards.length / 2;
                const matchedPairs = room.gameData.cards.filter(c => c.isMatched).length / 2;
                
                if (matchedPairs === totalPairs) {
                    // Game completed!
                    endGameWithResults(room);
                }
            } else {
                // Cards don't match, flip them back after a delay
                console.log(`[GAME ${room.id}] Cards don't match, flipping back`);
                
                setTimeout(() => {
                    firstCard.isFlipped = false;
                    secondCard.isFlipped = false;
                    
                    // Broadcast cards flipped back
                    broadcastToRoom(room, {
                        type: 'cardsFlippedBack',
                        cardIds: [firstCardId, secondCardId]
                    });
                }, 1500); // 1.5 second delay to show the cards
            }
            
            // Reset flipped cards
            room.flippedCards = [];
        }
    }
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
 * Handle game over message from player
 * @param client The client who finished the game
 * @param room The room the client is in
 * @param msg The message containing game completion data
 */
function handleGameOver(client: Client, room: Room, msg: any): void {
    if (!room.gameStarted || room.gameEnded) {
        console.log(`[GAME ${room.id}] Game over message received but game not active`);
        return;
    }
    
    console.log(`[GAME ${room.id}] Player ${client.nickname} completed the game with score ${client.score}`);
    
    // Mark player as finished
    client.gameFinished = true;
    
    // Check if all players have finished or if this player found all pairs
    const allPlayersFinished = Array.from(room.clients.values())
        .filter(c => !c.isHost)
        .every(c => c.gameFinished);
    
    if (msg.allPairsFound || allPlayersFinished) {
        // End the game and send final results
        endGameWithResults(room);
    } else {
        // Send updated player list to show who finished
        sendPlayerListUpdate(room, broadcastToRoom);
    }
}

/**
 * End game and send final results to all players
 * @param room The room to end the game for
 */
function endGameWithResults(room: Room): void {
    if (room.gameEnded) return;
    
    console.log(`[GAME ${room.id}] Ending game and calculating final results`);
    
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
    
    // End the game
    room.gameStarted = false;
    room.gameEnded = true;
    if (room.timer) {
        clearTimeout(room.timer);
        room.timer = null;
    }
    
    // Send final results to all players
    broadcastToRoom(room, {
        type: 'gameEnded',
        reason: 'Game completed',
        finalResults: finalResults
    });
    
    console.log(`[GAME ${room.id}] Final results sent:`, finalResults);
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