package whackmole

import (
	"encoding/json"
	"log"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// HandleWhackAMoleGameMessage processes whack-a-mole game specific messages
func HandleWhackAMoleGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {
	case "moleHit":
		handleMoleHit(gameRoom, client, message)
	case "scoreUpdate":
		handleScoreUpdate(gameRoom, client, message)
	case "gameStart":
		HandleGameStart(gameRoom, client, message)
	case "hostStartGame":
		handleHostStartGame(gameRoom, client, message)
	case "gameEnd":
		handleGameEnd(gameRoom, client, message)
	default:
		log.Printf("[WHACKMOLE] Unknown whack-a-mole game message type: %s", message.Type)
	}
}

// HandleGameStart initializes and starts a new whack-a-mole game
func HandleGameStart(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[WHACKMOLE] Starting game in room %s", gameRoom.ID)

	// Extract game settings from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[WHACKMOLE] Invalid message data format")
		return
	}

	// Parse game settings
	settings := GameSettings{
		Duration:          60,   // Default 60 seconds
		MoleSpawnInterval: 1000, // Default 1 second
		MoleLifetime:      2000, // Default 2 seconds
		MoleCount:         9,    // Default 9 holes
	}

	if gameSettings, exists := dataMap["gameSettings"].(map[string]interface{}); exists {
		if duration, ok := gameSettings["duration"].(float64); ok {
			settings.Duration = int(duration)
		}
		if interval, ok := gameSettings["moleSpawnInterval"].(float64); ok {
			settings.MoleSpawnInterval = int(interval)
		}
		if lifetime, ok := gameSettings["moleLifetime"].(float64); ok {
			settings.MoleLifetime = int(lifetime)
		}
		if count, ok := gameSettings["totalMoles"].(float64); ok {
			settings.MoleCount = int(count)
		}
	}

	// Create a new game instance
	game := NewGame(gameRoom.ID, settings)

	// Set callbacks for game events
	game.SetCallbacks(
		func(roomID string, data interface{}) {
			// Handle game updates
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type": "gameUpdate",
				"data": data,
			})
		},
		func(roomID string) {
			log.Printf("[WHACKMOLE] Game %s ended", roomID)
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type": "gameEnd",
			})
			gameRoom.GameData = nil // Clear game instance after game ends
		},
		func(roomID string, players map[string]*PlayerScore) {
			// Convert map to slice for JSON serialization
			playerScores := make([]PlayerScore, 0, len(players))
			for _, ps := range players {
				playerScores = append(playerScores, *ps)
			}
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type":    "scoreUpdate",
				"players": playerScores,
			})
		},
	)

	// Store the game instance in the room
	gameRoom.GameData = game

	// Start the game
	if err := game.Start(); err != nil {
		log.Printf("[WHACKMOLE] Error starting game %s: %v", gameRoom.ID, err)
		return
	}

	log.Printf("[WHACKMOLE] Game %s started", gameRoom.ID)

	// Notify all clients that the game has started
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type": "gameStarted",
		"data": map[string]interface{}{
			"gameSettings": settings,
			"moleHoles":    game.GetMoleHoles(),
		},
	})
}

// handleMoleHit processes mole hit messages from client
func handleMoleHit(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[WHACKMOLE] Processing moleHit from %s", client.Nickname)

	// Get game instance from room
	gameInterface := gameRoom.GameData
	if gameInterface == nil {
		log.Printf("[WHACKMOLE] No active game in room %s", gameRoom.ID)
		return
	}

	game, ok := gameInterface.(*Game)
	if !ok {
		log.Printf("[WHACKMOLE] Invalid game type in room %s", gameRoom.ID)
		return
	}

	// Extract hit data from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[WHACKMOLE] Invalid message data format")
		return
	}

	// Extract mole ID
	moleID, idOk := dataMap["moleId"].(string)
	if !idOk {
		log.Printf("[WHACKMOLE] Invalid moleId in message data")
		return
	}

	// Process the hit
	hit := game.ProcessMoleHit(client.Nickname, client.Nickname, moleID)
	if hit {
		// Get updated player data
		players := game.GetPlayers()
		if playerScore, exists := players[client.Nickname]; exists {
			// Update client score
			client.Mutex.Lock()
			client.Score = playerScore.Score
			client.Mutex.Unlock()

			// Broadcast score update
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type": "scoreUpdate",
				"data": map[string]interface{}{
					"playerId": client.Nickname,
					"score":    playerScore.Score,
				},
			})
		}
	}
}

// handleScoreUpdate processes score update messages from client
func handleScoreUpdate(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[WHACKMOLE] Processing scoreUpdate from %s", client.Nickname)

	// Extract score data from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[WHACKMOLE] Invalid message data format")
		return
	}

	// Extract score
	score, scoreOk := dataMap["score"].(float64)
	if !scoreOk {
		log.Printf("[WHACKMOLE] Invalid score in message data")
		return
	}

	// Update client score
	client.Mutex.Lock()
	client.Score = int(score)
	client.Mutex.Unlock()

	// Broadcast score update to all clients
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type": "scoreUpdate",
		"data": map[string]interface{}{
			"playerId": client.Nickname,
			"score":    int(score),
		},
	})
}

// handleGameEnd processes game end messages
func handleGameEnd(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[WHACKMOLE] Processing gameEnd from %s", client.Nickname)

	// Get game instance from room
	gameInterface := gameRoom.GameData
	if gameInterface == nil {
		log.Printf("[WHACKMOLE] No active game in room %s", gameRoom.ID)
		return
	}

	game, ok := gameInterface.(*Game)
	if !ok {
		log.Printf("[WHACKMOLE] Invalid game type in room %s", gameRoom.ID)
		return
	}

	// End the game
	game.Stop()

	// Clear game data
	gameRoom.GameData = nil

	// Broadcast game end
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type": "gameEnd",
	})
}

// handleHostStartGame handles game start from host
func handleHostStartGame(gameRoom *core.Room, client *core.Client, message core.Message) {
	if !client.IsHost {
		log.Printf("[WHACKMOLE] Non-host %s tried to start game", client.Nickname)
		return
	}

	log.Printf("[WHACKMOLE] Host %s starting game", client.Nickname)

	// Extract game settings from message
	settings := GameSettings{
		Duration:          60,  // Default 60 seconds
		MoleSpawnInterval: 1500, // Default 1.5 seconds
		MoleLifetime:      2000, // Default 2 seconds
		MoleCount:         9,    // Default 9 holes
	}

	// Try to extract settings from message data
	if dataMap, ok := message.Data.(map[string]interface{}); ok {
		if duration, exists := dataMap["duration"].(float64); exists {
			settings.Duration = int(duration)
		}
		if interval, exists := dataMap["moleSpawnInterval"].(float64); exists {
			settings.MoleSpawnInterval = int(interval)
		}
		if lifetime, exists := dataMap["moleLifetime"].(float64); exists {
			settings.MoleLifetime = int(lifetime)
		}
		if count, exists := dataMap["moleCount"].(float64); exists {
			settings.MoleCount = int(count)
		}
	}

	// Start the whack-a-mole game using the new logic function
	StartWhackAMoleGame(gameRoom, settings)
}





// SendGameState sends the current whack-a-mole game state to a client
func SendGameState(client *core.Client, gameRoom *core.Room) {
	if gameRoom.GameData == nil {
		log.Printf("[WHACKMOLE] No game data available for room %s", gameRoom.ID)
		return
	}

	// Parse game data
	var gameData GameData
	gameDataBytes, ok := gameRoom.GameData.([]byte)
	if !ok {
		log.Printf("[WHACKMOLE] Invalid game data type")
		return
	}
	if err := json.Unmarshal(gameDataBytes, &gameData); err != nil {
		log.Printf("[WHACKMOLE] Error parsing game data: %v", err)
		return
	}

	// Send game state to client
	response := map[string]interface{}{
		"type":     "gameData",
		"gameData": gameData,
		"gameTime": gameRoom.GameTime,
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("[WHACKMOLE] Error marshaling response: %v", err)
		return
	}

	err = client.Conn.WriteMessage(1, responseBytes)
	if err != nil {
		log.Printf("[WHACKMOLE] Error sending game state to %s: %v", client.Nickname, err)
		return
	}
	log.Printf("[WHACKMOLE] Sent game state to %s", client.Nickname)
}