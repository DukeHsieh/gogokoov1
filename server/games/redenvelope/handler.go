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
	registrar.RegisterHandler("collectEnvelope", HandleRedEnvelopeGameMessage)
	registrar.RegisterHandler("gameStart", HandleRedEnvelopeGameMessage)
	registrar.RegisterHandler("gameEnd", HandleRedEnvelopeGameMessage)
	registrar.RegisterHandler("redEnvelopeScoreUpdate", HandleRedEnvelopeGameMessage)
	// Register red envelope game start handler
	registrar.RegisterGameStartHandler("redenvelope", HandleRedEnvelopeHostStartGame)
}

// HandleRedEnvelopeGameMessage processes red envelope game specific messages
func HandleRedEnvelopeGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {
	case "collectEnvelope":
		handleCollectEnvelope(gameRoom, client, message)
	case "gameStart":
		handleGameStart(gameRoom, client, message)
	case "gameEnd":
		handleGameEnd(gameRoom, client, message)
	case "redEnvelopeScoreUpdate":
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

// handleCollectEnvelope processes envelope collection messages
func handleCollectEnvelope(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing collectEnvelope from %s", client.Nickname)
	// Add envelope collection logic here
}

// handleGameStart processes game start messages
func handleGameStart(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing gameStart from %s", client.Nickname)
	// Add game start logic here
}

// handleGameEnd processes game end messages
func handleGameEnd(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[REDENVELOPE] Processing gameEnd from %s", client.Nickname)
	// Add game end logic here
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

	// Extract score data from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[REDENVELOPE] Invalid message data format")
		return
	}

	// Extract total score
	totalScore, scoreOk := dataMap["totalScore"].(float64)
	if !scoreOk {
		log.Printf("[REDENVELOPE] Invalid totalScore in message data")
		return
	}

	// Update player score in game
	UpdatePlayerScore(gameRoom, client.Nickname, client.Nickname, int(totalScore))

	// Send updated leaderboard to room
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":   "leaderboard",
		"player": client.Nickname,
		"score":  int(totalScore),
	})

	log.Printf("[REDENVELOPE] Player %s updated total score to %d", client.Nickname, int(totalScore))
}
