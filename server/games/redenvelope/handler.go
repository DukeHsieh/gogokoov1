package redenvelope

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

// registerHandlers registers all red envelope game message handlers
func registerHandlers() {
	if registrar == nil {
		return
	}
	// Register red envelope game specific message types
	registrar.RegisterHandler("redenvelope-scoreupdate", HandleRedEnvelopeGameMessage)
	// Register red envelope game start handler
	registrar.RegisterHandler("redenvelope-startgame", HandleRedEnvelopeHostStartGame)
}

// HandleRedEnvelopeGameMessage processes red envelope game specific messages
func HandleRedEnvelopeGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {
	case "redenvelope-scoreupdate":
		handleScoreUpdate(gameRoom, client, message)
	default:
		log.Printf("[REDENVELOPE] Unknown red envelope game message type: %s", message.Type)
	}
}

// HandleRedEnvelopeHostStartGame handles red envelope game start messages
func HandleRedEnvelopeHostStartGame(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Starting red envelope game for host %s", client.Nickname)
	// Call the existing red envelope game start handler
	handleHostStartGame(gameRoom, client, message)
}

// handleHostStartGame handles game start from host
func handleHostStartGame(gameRoom *core.Room, client *core.Client, message core.Message) {
	if !client.IsHost {
		log.Printf("[REDENVELOPE] Non-host %s tried to start game", client.Nickname)
		return
	}

	log.Printf("[REDENVELOPE] Host %s starting game", client.Nickname)

	// Extract game settings from message data
	data, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[REDENVELOPE] Invalid message data format")
		return
	}

	// Helper function to safely extract float64 values with defaults
	getFloat64 := func(key string, defaultValue float64) float64 {
		if val, exists := data[key]; exists && val != nil {
			if floatVal, ok := val.(float64); ok {
				return floatVal
			}
		}
		return defaultValue
	}

	settings := GameSettings{
		Duration:         int(getFloat64("duration", 60)),
		SpawnInterval:    int(getFloat64("spawnInterval", 2)),
		EnvelopeLifetime: int(getFloat64("envelopeLifetime", 5)),
		EnvelopeCount:    int(getFloat64("envelopeCount", 10)),
	}

	// Start the game
	StartRedEnvelopeGame(gameRoom, settings)
}

// handleScoreUpdate processes score update messages from client
func handleScoreUpdate(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing scoreUpdate from %s", client.Nickname)

	// Debug: Print the entire message structure
	log.Printf("[REDENVELOPE] Full message: %+v", message)
	log.Printf("[REDENVELOPE] Message.Data type: %T", message.Data)
	log.Printf("[REDENVELOPE] Message.Data value: %+v", message.Data)

	// Extract score data from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[REDENVELOPE] Invalid message data format")
		return
	}

	// Debug: Print the dataMap contents
	log.Printf("[REDENVELOPE] DataMap contents: %+v", dataMap)
	for key, value := range dataMap {
		log.Printf("[REDENVELOPE] Key: %s, Value: %+v, Type: %T", key, value, value)
	}

	// Extract data from dataMap['data']
	rawData, ok := dataMap["data"]
	if !ok {
		log.Printf("[REDENVELOPE] 'data' key not found in message data")
		return
	}
	// extract totalScore from rawData
	rawScore, ok := rawData.(map[string]interface{})
	if !ok {
		log.Printf("[REDENVELOPE] 'data' is not a map")
		return
	}
	totalScore, ok := rawScore["totalScore"].(float64)
	if !ok {
		log.Printf("[REDENVELOPE] 'totalScore' key not found in message data")
		return
	}

	// Update player score in game
	UpdatePlayerScore(gameRoom, client.Nickname, client.Nickname, int(totalScore))

	// Calculate and send updated leaderboard to host
	leaderboard := calculateLeaderboard(gameRoom)

	room.BroadcastToHost(gameRoom, map[string]interface{}{
		"type":        "redenvelope-leaderboard",
		"leaderboard": leaderboard,
	})

	log.Printf("[REDENVELOPE] Player %s updated total score to %d", client.Nickname, int(totalScore))
}
