package message

import (
	"log"

	"gaming-platform/core"
	"gaming-platform/core/interfaces"
)

// gameStartHandlers stores game-specific start handlers
var gameStartHandlers = make(map[string]interfaces.GameStartHandler)

// RegisterGameStartHandler registers a game-specific start handler
func RegisterGameStartHandler(gameType string, handler interfaces.GameStartHandler) {
	gameStartHandlers[gameType] = handler
	log.Printf("[GAME_ROUTER] Registered start handler for game type: %s", gameType)
}

// HandleHostStartGameRouter routes hostStartGame messages to appropriate game handlers
func HandleHostStartGameRouter(room *core.Room, client *core.Client, message core.Message) {
	// Extract message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[GAME_ROUTER] Invalid message data format")
		return
	}

	// Check game type in the data
	data, dataOk := dataMap["data"].(map[string]interface{})
	if dataOk {
		if gameType, ok := data["gameType"].(string); ok {
			// Look for registered game start handler
			if handler, exists := gameStartHandlers[gameType]; exists {
				log.Printf("[GAME_ROUTER] Routing %s hostStartGame to registered handler", gameType)
				handler(room, client, message)
				return
			}
			log.Printf("[GAME_ROUTER] No registered handler for game type: %s", gameType)
			return
		}
	}

	log.Printf("[GAME_ROUTER] No game type specified in hostStartGame message")
}