package redenvelope

import (
	"fmt"
	"log"
	"math/rand"
	"sort"
	"time"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// GenerateRedEnvelope creates a new red envelope with random properties
func GenerateRedEnvelope() RedEnvelope {
	// Random position (X coordinate)
	x := rand.Float64() * 100 // 0-100% of screen width

	// Random size and corresponding value
	size, value := generateSizeAndValue()

	// Random speed based on size
	speed := generateSpeed(size)

	return RedEnvelope{
		ID:        fmt.Sprintf("env_%d_%d", time.Now().UnixNano(), rand.Intn(1000)),
		X:         x,
		Y:         -10, // Start above screen
		Value:     value,
		Size:      size,
		Speed:     speed,
		Created:   time.Now().UnixMilli(),
		Collected: false,
	}
}

// generateSizeAndValue returns size and value based on probability
func generateSizeAndValue() (string, int) {
	randomValue := rand.Float64()

	// Probability distribution:
	// Small: 70% (1-5 points)
	// Medium: 25% (6-15 points)
	// Large: 5% (16-50 points)

	if randomValue < 0.70 {
		// Small envelope
		return "small", 1 + rand.Intn(5)
	} else if randomValue < 0.95 {
		// Medium envelope
		return "medium", 6 + rand.Intn(10)
	} else {
		// Large envelope
		return "large", 16 + rand.Intn(35)
	}
}

// generateSpeed returns speed based on envelope size
func generateSpeed(size string) float64 {
	switch size {
	case "small":
		return 1.0 + rand.Float64()*0.5 // 1.0-1.5
	case "medium":
		return 0.8 + rand.Float64()*0.4 // 0.8-1.2
	case "large":
		return 0.5 + rand.Float64()*0.3 // 0.5-0.8
	default:
		return 1.0
	}
}

// InitializeGame creates initial game data
func InitializeGame(settings GameSettings) *GameData {
	log.Printf("[REDENVELOPE] Initializing game with settings: %+v", settings)

	return &GameData{
		Envelopes:    []RedEnvelope{},
		GameTime:     settings.GameTime,
		TimeLeft:     settings.GameTime,
		Status:       "waiting",
		StartTime:    time.Time{},
		EnvelopeRate: settings.EnvelopeRate,
	}
}

// StartGame begins the game and starts timers
func StartGame(gameData *GameData, gameRoom *core.Room) {
	log.Printf("[REDENVELOPE] Starting game in room %s", gameRoom.ID)

	gameData.Status = "playing"
	gameData.StartTime = time.Now()
	gameData.TimeLeft = gameData.GameTime

	// Start game timer
	go startGameTimer(gameData, gameRoom)

	// Start envelope generation
	go startEnvelopeGeneration(gameData, gameRoom)

	// Notify all clients that game has started
	notifyGameStart(gameRoom, gameData)
}

// startGameTimer manages the game countdown
func startGameTimer(gameData *GameData, gameRoom *core.Room) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if gameData.Status != "playing" {
			return
		}

		gameData.TimeLeft--

		// Broadcast game time update
		timerData := GameTimerData{
			TimeLeft: gameData.TimeLeft,
			Status:   gameData.Status,
		}

		room.BroadcastToRoom(gameRoom, map[string]interface{}{
			"type": "gameTimeUpdate",
			"timeLeft": gameData.TimeLeft,
			"status": gameData.Status,
		})
		
		// Also send legacy gameTimer for backward compatibility
		room.BroadcastToRoom(gameRoom, map[string]interface{}{
			"type": "gameTimer",
			"data": timerData,
		})

		// Check if game should end
		if gameData.TimeLeft <= 0 {
			EndGame(gameData, gameRoom)
			return
		}
	}
}

// startEnvelopeGeneration generates red envelopes periodically
func startEnvelopeGeneration(gameData *GameData, gameRoom *core.Room) {
	rate := time.Duration(gameData.EnvelopeRate) * time.Millisecond
	ticker := time.NewTicker(rate)
	defer ticker.Stop()

	for range ticker.C {
		if gameData.Status != "playing" {
			return
		}

		// Remove old envelopes that have fallen off screen
		cleanupOldEnvelopes(gameData)

		// Generate new envelope if under limit
		if len(gameData.Envelopes) < 10 { // Max 10 envelopes on screen
			newEnvelope := GenerateRedEnvelope()
			gameData.Envelopes = append(gameData.Envelopes, newEnvelope)

			// Broadcast new envelope to all clients
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type": "newEnvelope",
				"data": newEnvelope,
			})
		}
	}
}

// cleanupOldEnvelopes removes envelopes that are too old or off-screen
func cleanupOldEnvelopes(gameData *GameData) {
	now := time.Now().UnixMilli()
	var activeEnvelopes []RedEnvelope

	for _, envelope := range gameData.Envelopes {
		// Remove if older than 10 seconds or collected
		if now-envelope.Created < 10000 && !envelope.Collected {
			activeEnvelopes = append(activeEnvelopes, envelope)
		}
	}

	gameData.Envelopes = activeEnvelopes
}

// CollectEnvelope handles envelope collection by a player
func CollectEnvelope(gameData *GameData, gameRoom *core.Room, client *core.Client, envelopeID string) {
	log.Printf("[REDENVELOPE] Player %s collecting envelope %s", client.Nickname, envelopeID)

	// Find the envelope
	for i, envelope := range gameData.Envelopes {
		if envelope.ID == envelopeID && !envelope.Collected {
			// Mark as collected
			gameData.Envelopes[i].Collected = true

			// Update player score
			client.Score += envelope.Value

			// Broadcast envelope collection
			collectData := EnvelopeCollectData{
				EnvelopeID: envelopeID,
				Score:      envelope.Value,
				Timestamp:  time.Now().UnixMilli(),
			}

			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type": "envelopeCollected",
				"data": map[string]interface{}{
					"player":    client.Nickname,
					"envelope":  collectData,
					"newScore":  client.Score,
					"collected": 1, // Simple increment
				},
			})

			// Update rankings
			updateRankings(gameRoom)
			return
		}
	}

	log.Printf("[REDENVELOPE] Envelope %s not found or already collected", envelopeID)
}

// EndGame ends the current game and calculates final rankings
func EndGame(gameData *GameData, gameRoom *core.Room) {
	log.Printf("[REDENVELOPE] Ending game in room %s", gameRoom.ID)

	gameData.Status = "ended"

	// Calculate final rankings
	finalRankings := calculateFinalRankings(gameRoom)

	// Broadcast game end with final results
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type": "gameEnd",
		"data": map[string]interface{}{
			"rankings": finalRankings,
			"gameTime": gameData.GameTime,
		},
	})

	log.Printf("[REDENVELOPE] Game ended. Final rankings: %+v", finalRankings)
}

// updateRankings calculates and broadcasts current player rankings
func updateRankings(gameRoom *core.Room) {
	rankings := calculateRankings(gameRoom)

	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type": "rankingUpdate",
		"data": rankings,
	})
}

// calculateRankings returns current player rankings
func calculateRankings(gameRoom *core.Room) []PlayerScore {
	var rankings []PlayerScore

	for client := range gameRoom.AllClients {
		rankings = append(rankings, PlayerScore{
			Nickname:       client.Nickname,
			Score:          client.Score,
			CollectedCount: 0, // We'll track this separately if needed
		})
	}

	// Sort by score (descending), then by collected count (descending)
	sort.Slice(rankings, func(i, j int) bool {
		if rankings[i].Score == rankings[j].Score {
			return rankings[i].CollectedCount > rankings[j].CollectedCount
		}
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

// notifyGameStart broadcasts game start to all clients
func notifyGameStart(gameRoom *core.Room, gameData *GameData) {
	clientData := ClientGameData{
		GameSettings: GameSettings{
			GameTime:     gameData.GameTime,
			EnvelopeRate: gameData.EnvelopeRate,
		},
		GameTime: gameData.GameTime,
		TimeLeft: gameData.TimeLeft,
		Status:   gameData.Status,
	}

	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "platformGameStarted",
		"gameType": "redenvelope",
		"data":     clientData,
	})
}

// GetDefaultSettings returns default game settings
func GetDefaultSettings() GameSettings {
	return GameSettings{
		GameTime:      60,   // 60 seconds
		EnvelopeCount: 100,  // Max envelopes during game
		EnvelopeRate:  1500, // Generate every 1.5 seconds
		MaxEnvelopes:  10,   // Max on screen
		Difficulty:    1,    // Easy difficulty
	}
}
