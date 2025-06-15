package whackmole

import (
	"encoding/json"
	"log"
	"sort"
	"time"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// startTimeUpdates begins sending time updates every second
func startTimeUpdates(gameRoom *core.Room, duration int) {
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if gameRoom.GameEnded {
					return
				}

				// Decrease game time
				gameRoom.GameTime--

				if gameRoom.GameTime < 0 {
					gameRoom.GameTime = 0
				}

				// Send time update
				room.BroadcastToRoom(gameRoom, map[string]interface{}{
					"type":     "timeUpdate",
					"gameType": "whackmole",
					"timeLeft": gameRoom.GameTime,
				})

				// Check if time is up
				if gameRoom.GameTime <= 0 {
					log.Printf("[WHACKMOLE] Time up for room %s, ending game", gameRoom.ID)
					HandleGameEnd(gameRoom)
					return
				}
			case <-gameRoom.StopChan:
				return
			}
		}
	}()
}

// UpdatePlayerScore updates a player's total score
func UpdatePlayerScore(gameRoom *core.Room, playerID, nickname string, totalScore int) {
	if gameRoom.GameEnded {
		return
	}

	// Find the client and update their score
	for client := range gameRoom.PlayerClients {
		if client.Nickname == nickname {
			client.Score = totalScore
			log.Printf("[WHACKMOLE] Player %s score updated to %d in room %s", nickname, totalScore, gameRoom.ID)
			
			// Broadcast score update
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type":   "scoreUpdate",
				"player": nickname,
				"score":  totalScore,
			})
			
			// Broadcast leaderboard update
			leaderboard := calculateLeaderboard(gameRoom)
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type":    "leaderboard",
				"players": leaderboard,
			})
			
			break
		}
	}
}

// calculateLeaderboard calculates and returns player rankings
func calculateLeaderboard(gameRoom *core.Room) []PlayerScore {
	var players []PlayerScore

	// Collect player scores from PlayerClients
	for client := range gameRoom.PlayerClients {
		players = append(players, PlayerScore{
			Nickname: client.Nickname,
			Score:    client.Score,
			HitCount: 0, // Not tracking hit count in simplified version
		})
	}

	// Sort by score (descending)
	sort.Slice(players, func(i, j int) bool {
		return players[i].Score > players[j].Score
	})

	// Assign ranks
	for i := range players {
		players[i].Rank = i + 1
	}

	return players
}

// HandleGameEnd processes the end of a whack-a-mole game
func HandleGameEnd(gameRoom *core.Room) {
	log.Printf("[WHACKMOLE] Game ended for room %s", gameRoom.ID)

	gameRoom.GameEnded = true
	gameRoom.WaitingForPlayers = false

	// Stop the game timer
	if gameRoom.Timer != nil {
		gameRoom.Timer.Stop()
	}

	// Calculate final scores and rankings
	leaderboard := calculateLeaderboard(gameRoom)

	// Broadcast game end to all clients
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":    "moleGameEnd",
		"players": leaderboard,
		"message": "Whack-a-mole game completed!",
	})

	log.Printf("[WHACKMOLE] Final scores for room %s: %+v", gameRoom.ID, leaderboard)
}



// StartWhackAMoleGame initializes and starts a whack-a-mole game
func StartWhackAMoleGame(gameRoom *core.Room, settings GameSettings) {
	log.Printf("[WHACKMOLE] Starting whack-a-mole game for room %s with settings: %+v", gameRoom.ID, settings)

	// Initialize game data
	gameData := GameData{
		TimeRemaining: settings.Duration,
		IsActive:      true,
		Moles:         make([]MoleState, 0),
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
	gameRoom.GameTime = settings.Duration

	// Reset player scores
	for client := range gameRoom.PlayerClients {
		client.Score = 0
	}

	// Start game timer
	gameRoom.Timer = time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-gameRoom.Timer.C:
				// This will be handled by startTimeUpdates
			case <-gameRoom.StopChan:
				return
			}
		}
	}()

	// Start time update ticker
	startTimeUpdates(gameRoom, settings.Duration)

	// Create client game data
	clientGameData := map[string]interface{}{
		"gameSettings": settings,
		"gameTime":     settings.Duration,
	}

	// Notify all clients that the game has started
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "platformGameStarted",
		"gameType": "whackmole",
		"gameData": clientGameData,
		"message":  "Whack-a-mole game started!",
	})

	log.Printf("[WHACKMOLE] Whack-a-mole game started for room %s with %d seconds", gameRoom.ID, settings.Duration)
}
