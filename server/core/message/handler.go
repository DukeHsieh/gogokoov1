// Package message handles WebSocket message processing
package message

import (
	"encoding/json"
	"log"

	"gaming-platform/core"
	"gaming-platform/games/memory"
)

// HandleMessage handles incoming WebSocket messages from clients
func HandleMessage(client *core.Client, room *core.Room, msgData []byte) {
	var msg map[string]interface{}
	err := json.Unmarshal(msgData, &msg)
	if err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		return
	}

	msgType, ok := msg["type"].(string)
	if !ok {
		log.Printf("Invalid message type from %s", client.Nickname)
		return
	}

	log.Printf("[DEBUG] handleMessage called with msg type: %s", msgType)

	// Route messages based on type
	switch msgType {
	case "join":
		handleJoinMessage(client, room)
	case "hostStartGame":
		// Delegate to memory game handler with game settings
		memory.HandleHostStartGame(room, client, msg)
	case "cardClick", "flipCard", "twoCardsClick", "scoreUpdate":
		// Convert message to core.Message format
		coreMsg := core.Message{
			Type: msgType,
			Data: msg,
		}
		// Delegate to memory game handler
		memory.HandleMemoryGameMessage(room, client, coreMsg)
	case "hostCloseGame":
		// Delegate to memory game handler
		memory.HandleHostCloseGame(room, client)
	default:
		log.Printf("[WEBSOCKET] Unhandled message type: %s from %s", msgType, client.Nickname)
	}
}

// handleJoinMessage handles join message
func handleJoinMessage(client *core.Client, room *core.Room) {
	log.Printf("[ROOM %s] %s joined the room", room.ID, client.Nickname)

	// Send current game state to the joining client
	if room.GameStarted {
		// Delegate to specific game handler based on game type
		// For now, assume memory game
		memory.SendGameState(client, room)
	} else {
		// Send waiting state
		waitingMsg := map[string]interface{}{
			"type": "waiting",
			"data": map[string]interface{}{
				"message": "Waiting for host to start the game",
			},
		}
		SendMessage(client, waitingMsg)
	}

	// Broadcast player list update to all clients in the room
	broadcastPlayerListUpdate(room)
}

// SendMessage sends a message to a specific client
func SendMessage(client *core.Client, message map[string]interface{}) {
	client.Mutex.Lock()
	defer client.Mutex.Unlock()

	err := client.Conn.WriteJSON(message)
	if err != nil {
		log.Printf("Error sending message to %s: %v", client.Nickname, err)
	}
}

// BroadcastMessage sends a message to all clients in a room
func BroadcastMessage(room *core.Room, message map[string]interface{}) {
	for client := range room.Clients {
		SendMessage(client, message)
	}
}

// BroadcastPlayerListUpdate broadcasts player list update to all clients
func BroadcastPlayerListUpdate(room *core.Room) {
	broadcastPlayerListUpdate(room)
}

// broadcastPlayerListUpdate broadcasts player list update to all clients
func broadcastPlayerListUpdate(room *core.Room) {
	players := []core.Player{}

	// Add host if exists
	if room.HostClient != nil {
		players = append(players, core.Player{
			Nickname: room.HostClient.Nickname,
			ID:       room.HostClient.Nickname, // Use nickname as ID for simplicity
			IsHost:   true,
			Score:    room.HostClient.Score,
		})
	}

	// Add other clients
	for client := range room.Clients {
		if client != room.HostClient {
			players = append(players, core.Player{
				Nickname: client.Nickname,
				ID:       client.Nickname,
				IsHost:   false,
				Score:    client.Score,
			})
		}
	}

	playerListMsg := map[string]interface{}{
		"type": "playerListUpdate",
		"data": map[string]interface{}{
			"players": players,
		},
	}

	BroadcastMessage(room, playerListMsg)
}