package whackmole

import (
	"gaming-platform/core"
)

// HandleWhackAMoleWebSocketMessage handles whack-a-mole game messages from WebSocket
// This function converts old message format to new handler architecture
func HandleWhackAMoleWebSocketMessage(room *core.Room, client *core.Client, msg map[string]interface{}) {
	// Convert the old message format to the new core.Message format
	message := core.Message{
		Type: msg["type"].(string),
		Data: msg["data"],
	}

	// Delegate to the new handler
	HandleWhackAMoleGameMessage(room, client, message)
}