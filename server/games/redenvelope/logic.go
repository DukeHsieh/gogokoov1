package redenvelope

import (
	"log"
	"sort"
	"time"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// startTimeUpdates handles the game timer and broadcasts time updates
func startTimeUpdates(gameRoom *core.Room, gameData *GameData) {
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				gameData.TimeLeft--

				// Broadcast time update
				room.BroadcastToRoom(gameRoom, map[string]interface{}{
					"type": "timeUpdate",
					"data": map[string]interface{}{
						"timeLeft": gameData.TimeLeft,
					},
				})

				// Check if game should end
				if gameData.TimeLeft <= 0 {
					log.Printf("[REDENVELOPE] Time up for room %s, ending game", gameRoom.ID)
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
			log.Printf("[REDENVELOPE] Player %s score updated to %d in room %s", nickname, totalScore, gameRoom.ID)
			
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
			Nickname:       client.Nickname,
			Score:          client.Score,
			CollectedCount: 0, // Not tracking collected count in simplified version
			Rank:           0,
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

// HandleGameEnd processes the end of a red envelope game
func HandleGameEnd(gameRoom *core.Room) {
	log.Printf("[REDENVELOPE] Game ended for room %s", gameRoom.ID)

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
		"type":    "redEnvelopeGameEnd",
		"players": leaderboard,
		"message": "Red envelope game completed!",
	})

	log.Printf("[REDENVELOPE] Final scores for room %s: %+v", gameRoom.ID, leaderboard)
}

// StartRedEnvelopeGame initializes and starts a red envelope game
func StartRedEnvelopeGame(gameRoom *core.Room, settings GameSettings) {
	log.Printf("[REDENVELOPE] Starting red envelope game for room %s with settings: %+v", gameRoom.ID, settings)

	// Initialize game data
	gameData := &GameData{
		TimeLeft: settings.Duration,
		Active:   true,
	}

	// Store game data in room
	gameRoom.GameData = gameData
	gameRoom.GameStarted = true

	// Reset all client scores
	for client := range gameRoom.AllClients {
		client.Score = 0
	}

	// Start game timer
	go startTimeUpdates(gameRoom, gameData)

	// Create client game data
	clientGameData := map[string]interface{}{
		"gameData": gameData,
		"settings": settings,
	}

	// Broadcast game start to all clients
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "platformGameStarted",
		"gameType": "redenvelope",
		"data":     clientGameData,
	})

	log.Printf("[REDENVELOPE] Red envelope game started for room %s with %d seconds", gameRoom.ID, settings.Duration)
}

// calculateRankings calculates and returns current player rankings
func calculateRankings(gameRoom *core.Room) []PlayerScore {
	var rankings []PlayerScore

	for client := range gameRoom.AllClients {
		rankings = append(rankings, PlayerScore{
			Nickname:       client.Nickname,
			Score:          client.Score,
			CollectedCount: 0, // We'll track this separately if needed
		})
	}

	// Sort by score (descending)
	sort.Slice(rankings, func(i, j int) bool {
		return rankings[i].Score > rankings[j].Score
	})

	// Assign ranks
	for i := range rankings {
		rankings[i].Rank = i + 1
	}

	return rankings
}



// calculateFinalRankings returns final game rankings
func calculateFinalRankings(gameRoom *core.Room) []PlayerScore {
	return calculateRankings(gameRoom)
}
