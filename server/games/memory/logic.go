// Package memory implements the memory card game logic
package memory

import (
	"encoding/json"
	"log"
	"math/rand"
	"sort"
	"time"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// GenerateCards creates a shuffled deck of memory cards with specified number of pairs
func GenerateCards(numPairs int) []Card {
	cards := []Card{}

	// Define suits and values
	suits := []string{"heart", "diamond", "club", "spade"}
	values := []string{"A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"}

	// Calculate how many unique cards we need
	totalUniqueCards := len(suits) * len(values) // 52 total unique cards
	if numPairs > totalUniqueCards {
		numPairs = totalUniqueCards // Cap at maximum available
		log.Printf("[MEMORY] Requested %d pairs exceeds maximum %d, using maximum", numPairs, totalUniqueCards)
	}

	// Generate the requested number of pairs
	pairsGenerated := 0
	for _, suit := range suits {
		for _, value := range values {
			if pairsGenerated >= numPairs {
				break
			}
			// Create two identical cards for each suit-value combination
			for i := 0; i < 2; i++ {
				cards = append(cards, Card{
					PositionId: 0, // Will be assigned after shuffling
					Suit:       suit,
					Value:      value,
					IsFlipped:  false,
					IsMatched:  false,
				})
			}
			pairsGenerated++
		}
		if pairsGenerated >= numPairs {
			break
		}
	}

	// Shuffle the cards
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(cards), func(i, j int) {
		cards[i], cards[j] = cards[j], cards[i]
	})

	// Assign position IDs after shuffling
	for i := range cards {
		cards[i].PositionId = i
	}

	log.Printf("[MEMORY] Generated %d cards (%d pairs)", len(cards), numPairs)
	return cards
}

// HandleGameEnd processes the end of a memory game
func HandleGameEnd(gameRoom *core.Room) {
	log.Printf("[MEMORY] Game ended for room %s", gameRoom.ID)

	gameRoom.GameEnded = true
	gameRoom.WaitingForPlayers = false

	// Stop the game timer
	if gameRoom.Timer != nil {
		gameRoom.Timer.Stop()
	}

	// Calculate final scores and rankings
	playerScores := CalculateScores(gameRoom)

	// Broadcast game end to all clients
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":    "gameEnded",
		"scores":  playerScores,
		"message": "Memory game completed!",
	})

	log.Printf("[MEMORY] Final scores for room %s: %+v", gameRoom.ID, playerScores)
}

// CalculateScores calculates and ranks player scores (excluding host)
func CalculateScores(gameRoom *core.Room) []PlayerScore {
	var playerScores []PlayerScore

	// Collect only non-host player scores
	for client := range gameRoom.Clients {
		// Skip host players, only include regular players in scoring
		if !client.IsHost {
			playerScores = append(playerScores, PlayerScore{
				Nickname: client.Nickname,
				Score:    client.Score,
			})
		}
	}

	// Sort by score (descending)
	sort.Slice(playerScores, func(i, j int) bool {
		return playerScores[i].Score > playerScores[j].Score
	})

	// Assign ranks
	for i := range playerScores {
		playerScores[i].Rank = i + 1
	}

	return playerScores
}

// StartMemoryGame initializes and starts a memory game
func StartMemoryGame(gameRoom *core.Room, numPairs int, gameTime int) {
	log.Printf("[MEMORY] Starting memory game for room %s with %d pairs", gameRoom.ID, numPairs)

	// Initialize game data without cards (cards will be generated on client side)
	gameData := GameData{
		Cards:        []Card{}, // Empty cards array
		GameTime:     gameTime,
		FlippedCards: []CardRef{},
	}

	// Store game data in room
	gameDataBytes, err := json.Marshal(gameData)
	if err != nil {
		log.Printf("Error marshaling game data: %v", err)
		return
	}

	// Set game state
	gameRoom.GameData = gameDataBytes
	gameRoom.GameStarted = true
	gameRoom.GameEnded = false
	gameRoom.WaitingForPlayers = false
	gameRoom.GameTime = gameData.GameTime

	// Reset only non-host player scores
	for client := range gameRoom.Clients {
		// Only reset scores for regular players, not hosts
		if !client.IsHost {
			client.Score = 0
		}
	}

	// Start game timer (countdown from gameTime to 0)
	gameRoom.Timer = time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-gameRoom.Timer.C:
				gameRoom.GameTime--
				// Broadcast game time update every second
				room.BroadcastToRoom(gameRoom, map[string]interface{}{
					"type":     "gameTimeUpdate",
					"timeLeft": gameRoom.GameTime,
				})
				
				// Also send legacy timeUpdate for backward compatibility
				room.BroadcastToRoom(gameRoom, map[string]interface{}{
					"type":     "timeUpdate",
					"timeLeft": gameRoom.GameTime,
				})

				// Check if time is up
				if gameRoom.GameTime <= 0 {
					log.Printf("[MEMORY] Time up for room %s, ending game", gameRoom.ID)
					HandleGameEnd(gameRoom)
					return
				}
			case <-gameRoom.StopChan:
				gameRoom.Timer.Stop()
				return
			}
		}
	}()

	// Create client game data with only game settings (no cards)
	clientGameData := map[string]interface{}{
		"gameSettings": GameSettings{
			NumPairs: numPairs,
			GameTime: gameTime,
		},
		"gameTime": gameTime,
	}

	// Broadcast game start to all clients with game parameters only
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "platformGameStarted",
		"gameType": "memory",
		"gameData": clientGameData,
		"message":  "Memory game started!",
	})

	// Also send gameData message for compatibility
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "gameData",
		"gameData": clientGameData,
	})

	log.Printf("[MEMORY] Memory game started for room %s with %d pairs and %d seconds", gameRoom.ID, numPairs, gameTime)
}

// HandleTwoCardsClick processes two cards being clicked simultaneously
