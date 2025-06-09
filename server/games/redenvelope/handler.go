package redenvelope

import (
	"log"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// HandleRedEnvelopeGameMessage processes red envelope game specific messages
func HandleRedEnvelopeGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {
	case "collectEnvelope":
		handleCollectEnvelope(gameRoom, client, message)
	case "scoreUpdate":
		handleScoreUpdate(gameRoom, client, message)
	case "gameStart":
		HandleGameStart(gameRoom, client, message)
	case "gameEnd":
		handleGameEnd(gameRoom, client, message)
	default:
		log.Printf("[REDENVELOPE] Unknown red envelope game message type: %s", message.Type)
	}
}

// handleCollectEnvelope processes envelope collection messages from client
func handleCollectEnvelope(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing collectEnvelope from %s", client.Nickname)

	// Extract envelope data from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[REDENVELOPE] Invalid message data format")
		return
	}

	// Extract envelope ID
	envelopeID, idOk := dataMap["envelopeId"].(string)
	if !idOk {
		// Try to get from nested data field
		if nestedData, exists := dataMap["data"].(map[string]interface{}); exists {
			if id, found := nestedData["envelopeId"].(string); found {
				envelopeID = id
				idOk = true
			}
		}
	}

	if !idOk {
		log.Printf("[REDENVELOPE] Invalid envelopeId in message data. Full message: %+v", dataMap)
		return
	}

	log.Printf("[REDENVELOPE] Extracted envelopeId: %s from data: %+v", envelopeID, dataMap)

	// Get game data from room
	gameData, ok := gameRoom.GameData.(*GameData)
	if !ok {
		log.Printf("[REDENVELOPE] Invalid game data type in room")
		return
	}

	// Process envelope collection
	CollectEnvelope(gameData, gameRoom, client, envelopeID)
}

// handleScoreUpdate processes score update messages from client
func handleScoreUpdate(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing scoreUpdate from %s", client.Nickname)

	// Extract score data from message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[REDENVELOPE] Invalid message data format")
		return
	}

	// Extract score from message
	score, scoreOk := dataMap["score"].(float64)

	if !scoreOk {
		// Try to get score from nested data field
		if nestedData, exists := dataMap["data"].(map[string]interface{}); exists {
			if s, found := nestedData["score"].(float64); found {
				score = s
				scoreOk = true
			}
		}
	}

	if !scoreOk {
		log.Printf("[REDENVELOPE] Invalid score in message data. Full message: %+v", dataMap)
		return
	}

	log.Printf("[REDENVELOPE] Extracted score: %.0f from data: %+v", score, dataMap)

	// Update client score
	client.Score = int(score)
	log.Printf("[REDENVELOPE] Updated score for %s: %d", client.Nickname, client.Score)

	// Broadcast game score update to all clients
    room.BroadcastToRoom(gameRoom, map[string]interface{}{
        "type":   "gameScoreUpdate",
        "player": client.Nickname,
        "score":  client.Score,
    })
    
    // Also send legacy scoreUpdate for backward compatibility
    room.BroadcastToRoom(gameRoom, map[string]interface{}{
        "type":   "scoreUpdate",
        "player": client.Nickname,
        "score":  client.Score,
    })

    // Update and broadcast rankings
    updateRankings(gameRoom)
}

// handleGameStart processes game start messages (usually from host)
func HandleGameStart(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing gameStart from %s", client.Nickname)

	// Check if client is host
	if !client.IsHost {
		log.Printf("[REDENVELOPE] Non-host client %s tried to start game", client.Nickname)
		return
	}

	// Extract game settings from message (if any)
	settings := GetDefaultSettings()

	if dataMap, ok := message.Data.(map[string]interface{}); ok {
		if gameTime, exists := dataMap["gameTime"].(float64); exists {
			settings.GameTime = int(gameTime)
		}
		if difficulty, exists := dataMap["difficulty"].(float64); exists {
			settings.Difficulty = int(difficulty)
		}
		if envelopeRate, exists := dataMap["envelopeRate"].(float64); exists {
			settings.EnvelopeRate = int(envelopeRate)
		}
	}

	// Initialize game data
	gameData := InitializeGame(settings)
	gameRoom.GameData = gameData

	// Initialize all clients' scores
	for c := range gameRoom.Clients {
		c.Score = 0
	}

	// Start the game
	StartGame(gameData, gameRoom)

	log.Printf("[REDENVELOPE] Game started in room %s with settings: %+v", gameRoom.ID, settings)
}

// handleGameEnd processes game end messages (usually from host)
func handleGameEnd(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing gameEnd from %s", client.Nickname)

	// Check if client is host
	if !client.IsHost {
		log.Printf("[REDENVELOPE] Non-host client %s tried to end game", client.Nickname)
		return
	}

	// Get game data from room
	gameData, ok := gameRoom.GameData.(*GameData)
	if !ok {
		log.Printf("[REDENVELOPE] Invalid game data type in room")
		return
	}

	// End the game
	EndGame(gameData, gameRoom)

	log.Printf("[REDENVELOPE] Game manually ended by host in room %s", gameRoom.ID)
}

// InitializeRedEnvelopeGame sets up initial game state for a room
func InitializeRedEnvelopeGame(gameRoom *core.Room) {
	log.Printf("[REDENVELOPE] Initializing red envelope game for room %s", gameRoom.ID)

	// Set default game settings
	settings := GetDefaultSettings()
	gameData := InitializeGame(settings)
	gameRoom.GameData = gameData

	// Initialize all clients' scores
	for client := range gameRoom.Clients {
		client.Score = 0
	}

	// Send initial game data to all clients
	clientData := ClientGameData{
		GameSettings: settings,
		GameTime:     gameData.GameTime,
		TimeLeft:     gameData.TimeLeft,
		Status:       gameData.Status,
	}

	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type": "gameInit",
		"data": clientData,
	})

	log.Printf("[REDENVELOPE] Red envelope game initialized for room %s", gameRoom.ID)
}

// GetGameStatus returns current game status for monitoring
func GetGameStatus(gameRoom *core.Room) map[string]interface{} {
	gameData, ok := gameRoom.GameData.(*GameData)
	if !ok {
		return map[string]interface{}{
			"status": "not_initialized",
			"error":  "Invalid game data",
		}
	}

	rankings := calculateRankings(gameRoom)

	return map[string]interface{}{
		"status":    gameData.Status,
		"timeLeft":  gameData.TimeLeft,
		"gameTime":  gameData.GameTime,
		"envelopes": len(gameData.Envelopes),
		"players":   len(gameRoom.Clients),
		"rankings":  rankings,
		"startTime": gameData.StartTime,
	}
}
