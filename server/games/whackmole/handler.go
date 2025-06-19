package whackmole

import (
	"log"

	"gaming-platform/core"
	"gaming-platform/core/interfaces"
	"gaming-platform/platform/room"
)

// registrar holds the registration interface
var registrar interfaces.RegistrationInterface

// SetRegistrar sets the registration interface
func SetRegistrar(r interfaces.RegistrationInterface) {
	registrar = r
	// Register all handlers when registrar is set
	registerHandlers()
}

// registerHandlers registers all whack-a-mole game message handlers
func registerHandlers() {
	if registrar == nil {
		return
	}
	// Register whack-a-mole game specific message types
	registrar.RegisterHandler("mole-scoreupdate", HandleWhackAMoleGameMessage)
	// Register whack-a-mole game start handler
	registrar.RegisterHandler("mole-startgame", HandleWhackAMoleGameMessage)
}

// HandleWhackAMoleGameMessage processes whack-a-mole game specific messages
func HandleWhackAMoleGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {
	case "mole-scoreupdate":
		handleScoreUpdate(gameRoom, client, message)
	case "mole-startgame", "hostStartGame":
		HandleWhackAMoleHostStartGame(gameRoom, client, message)
	default:
		log.Printf("[WHACKMOLE] Unknown whack-a-mole game message type: %s", message.Type)
	}
}

// HandleWhackAMoleHostStartGame handles whack-a-mole game start messages
func HandleWhackAMoleHostStartGame(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[WHACKMOLE] Starting whack-a-mole game for host %s", client.Nickname)
	// Call the game start logic directly to avoid recursion
	handleHostStartGame(gameRoom, client, message)
}

// handleScoreUpdate processes score update messages from client
func handleScoreUpdate(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[WHACKMOLE] Processing scoreUpdate from %s", client.Nickname)

	// Get game instance from room
	gameInterface := gameRoom.GameData
	if gameInterface == nil {
		log.Printf("[WHACKMOLE] No active game in room %s", gameRoom.ID)
		return
	}

	// Extract score data from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[WHACKMOLE] Invalid message data format")
		return
	}

	// Extract data from dataMap['data']
	rawData, ok := dataMap["data"]
	if !ok {
		log.Printf("[WHACKMOLE] 'data' key not found in message data")
		return
	}
	// extract totalScore from rawData
	rawScore, ok := rawData.(map[string]interface{})
	if !ok {
		log.Printf("[WHACKMOLE] 'data' is not a map")
		return
	}
	totalScore, ok := rawScore["totalScore"].(float64)
	if !ok {
		log.Printf("[WHACKMOLE] 'totalScore' key not found in message data")
		return
	}

	// Update player score in game
	UpdatePlayerScore(gameRoom, client.Nickname, client.Nickname, int(totalScore))

	// Calculate and send updated leaderboard to host
	leaderboard := calculateLeaderboard(gameRoom)

	room.BroadcastToHost(gameRoom, map[string]interface{}{
		"type":        "mole-leaderboard",
		"leaderboard": leaderboard,
	})

	log.Printf("[WHACKMOLE] Player %s updated total score to %d", client.Nickname, int(totalScore))
}

// handleHostStartGame processes host start game messages
func handleHostStartGame(gameRoom *core.Room, client *core.Client, message core.Message) {
	// Check if client is host
	if !client.IsHost {
		log.Printf("[WHACKMOLE] Non-host client %s attempted to start game", client.Nickname)
		return
	}

	// Extract message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[WHACKMOLE] Invalid message data format")
		return
	}

	// Extract game settings with defaults
	duration := 60 // default 60 seconds
	if d, exists := dataMap["duration"]; exists {
		if dFloat, ok := d.(float64); ok {
			duration = int(dFloat)
		}
	}

	moleSpawnInterval := 1000 // default 1 second
	if msi, exists := dataMap["moleSpawnInterval"]; exists {
		if msiFloat, ok := msi.(float64); ok {
			moleSpawnInterval = int(msiFloat)
		}
	}

	moleLifetime := 2000 // default 2 seconds
	if ml, exists := dataMap["moleLifetime"]; exists {
		if mlFloat, ok := ml.(float64); ok {
			moleLifetime = int(mlFloat)
		}
	}

	moleCount := 9 // default 9 holes
	if mc, exists := dataMap["moleCount"]; exists {
		if mcFloat, ok := mc.(float64); ok {
			moleCount = int(mcFloat)
		}
	}

	// Create game settings
	settings := GameSettings{
		Duration:          duration,
		MoleSpawnInterval: moleSpawnInterval,
		MoleLifetime:      moleLifetime,
		MoleCount:         moleCount,
	}

	// Start the game
	StartWhackAMoleGame(gameRoom, settings)
}
