package whackmole

import (
	"gaming-platform/core"
)

// HandleWhackAMoleWebSocketMessage handles whack-a-mole game messages from WebSocket
// This function converts old message format to new handler architecture
func HandleWhackAMoleWebSocketMessage(room *core.Room, client *core.Client, msg map[string]interface{}) {
	// Check if type exists and is a string
	msgType, ok := msg["type"].(string)
	if !ok {
		// If no type specified, assume it's a hostStartGame for whack-a-mole
		msgType = "hostStartGame"
	}

	// Convert the old message format to the new core.Message format
	message := core.Message{
		Type: msgType,
		Data: msg,
	}

	// Delegate to the new handler
	HandleWhackAMoleGameMessage(room, client, message)
}