// Package message handles WebSocket message processing
package message

import (
	"encoding/json"
	"log"

	"gaming-platform/core"
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

	// Check if there's a registered handler for this message type
	if handler, exists := GetHandler(msgType); exists {
		// Convert to core.Message format
		coreMsg := core.Message{
			Type: msgType,
			Data: msg,
		}
		// Call the registered handler
		handler(room, client, coreMsg)
		return
	}

	// Handle core platform messages that don't need registration
	switch msgType {
	case "join":
		handleJoinMessage(client, room)
	case "startGameWithNotification":
		handleStartGameWithNotification(client, room, msg)
	case "notifyPlatformPlayers":
		handleNotifyPlatformPlayers(client, room, msg)
	case "hostCloseGame":
		handleHostCloseGame(client, room)
	default:
		log.Printf("[WEBSOCKET] Unhandled message type: %s from %s", msgType, client.Nickname)
	}
}

// handleJoinMessage handles join messages
func handleJoinMessage(client *core.Client, room *core.Room) {
	log.Printf("[WEBSOCKET] %s joined room %s", client.Nickname, room.ID)
	
	// Game state will be sent by the specific game handlers
	// No direct game module calls here
	
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
	for client := range room.AllClients {
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

	// Add player clients
	for client := range room.PlayerClients {
		players = append(players, core.Player{
			Nickname: client.Nickname,
			ID:       client.Nickname,
			IsHost:   false,
			Score:    client.Score,
		})
	}

	// Send platform message for player list updates
	platformPlayerListMsg := map[string]interface{}{
		"type": "platformPlayerListUpdate",
		"data": map[string]interface{}{
			"players":     players,
			"playerCount": len(players),
			"roomName":    "遊戲房間",
		},
	}

	// Also send legacy message for backward compatibility
	legacyPlayerListMsg := map[string]interface{}{
		"type": "playerListUpdate",
		"data": map[string]interface{}{
			"players": players,
		},
	}

	//BroadcastMessage(room, platformPlayerListMsg)
	//BroadcastMessage(room, legacyPlayerListMsg)
	//send message to host
	if room.HostClient != nil {
		SendMessage(room.HostClient, legacyPlayerListMsg)
		SendMessage(room.HostClient, platformPlayerListMsg)
	}
}

// handleNotifyPlatformPlayers handles platform player notification
func handleNotifyPlatformPlayers(client *core.Client, room *core.Room, msg map[string]interface{}) {
	log.Printf("[DEBUG] handleNotifyPlatformPlayers called by %s in room %s", client.Nickname, room.ID)
	
	// Extract message and game type
	message, _ := msg["message"].(string)
	gameType, _ := msg["gameType"].(string)
	
	// Create platform notification message
	notificationMsg := map[string]interface{}{
		"type": "platformNotification",
		"data": map[string]interface{}{
			"message":  message,
			"gameType": gameType,
			"roomId":   room.ID,
		},
	}
	
	// Broadcast notification to all clients in the room
	BroadcastMessage(room, notificationMsg)
	
	// Use the hostStartGame router to handle game start
	coreMsg := core.Message{
		Type: "hostStartGame",
		Data: msg,
	}
	HandleHostStartGameRouter(room, client, coreMsg)
}

// handleStartGameWithNotification handles starting game with notification
func handleStartGameWithNotification(client *core.Client, room *core.Room, msg map[string]interface{}) {
	log.Printf("[WEBSOCKET] %s starting game with notification in room %s", client.Nickname, room.ID)
	
	// Check if client is host
	if !client.IsHost {
		log.Printf("[WEBSOCKET] Non-host %s tried to start game in room %s", client.Nickname, room.ID)
		return
	}
	
	// Use the hostStartGame router to handle game start
	coreMsg := core.Message{
		Type: "hostStartGame",
		Data: msg,
	}
	HandleHostStartGameRouter(room, client, coreMsg)
}

// handleScoreUpdate handles score updates for different game types
func handleScoreUpdate(client *core.Client, room *core.Room, msg map[string]interface{}) {
	log.Printf("[WEBSOCKET] Score update from %s in room %s", client.Nickname, room.ID)
	
	// Try to find a registered handler for scoreUpdate
	if handler, exists := GetHandler("scoreUpdate"); exists {
		coreMsg := core.Message{
			Type: "scoreUpdate",
			Data: msg,
		}
		handler(room, client, coreMsg)
		return
	}
	
	// Try game-specific score update handlers
	gameType := determineGameType(room, msg)
	scoreUpdateType := gameType + "ScoreUpdate"
	
	if handler, exists := GetHandler(scoreUpdateType); exists {
		coreMsg := core.Message{
			Type: scoreUpdateType,
			Data: msg,
		}
		handler(room, client, coreMsg)
	} else {
		log.Printf("[WEBSOCKET] No handler found for score update type: %s", scoreUpdateType)
	}
}

// handleHostCloseGame handles host closing game for different game types
func handleHostCloseGame(client *core.Client, room *core.Room) {
	log.Printf("[WEBSOCKET] Host %s closing game in room %s", client.Nickname, room.ID)
	
	// Check if there's a registered handler for gameEnd
	if handler, exists := GetHandler("gameEnd"); exists {
		coreMsg := core.Message{
			Type: "gameEnd",
			Data: map[string]interface{}{},
		}
		handler(room, client, coreMsg)
	} else {
		// Default behavior: reset room state
		room.GameStarted = false
		room.GameData = nil
		log.Printf("[WEBSOCKET] Game closed in room %s", room.ID)
	}
}

// determineGameType determines the current game type based on room state or message
func determineGameType(room *core.Room, msg map[string]interface{}) string {
	// Check message for game type hint
	if msg != nil {
		if gameType, exists := msg["gameType"].(string); exists {
			return gameType
		}
		// Check for red envelope specific fields
		if _, exists := msg["envelopeId"]; exists {
			return "redenvelope"
		}
		if _, exists := msg["collectedCount"]; exists {
			return "redenvelope"
		}
	}

	// Default to memory game if no clear indicators
	return "memory"
}

// Helper function to safely extract int values from map
func getIntFromMap(data map[string]interface{}, key string, defaultValue int) int {
	if value, exists := data[key]; exists {
		if intValue, ok := value.(float64); ok {
			return int(intValue)
		}
		if intValue, ok := value.(int); ok {
			return intValue
		}
	}
	return defaultValue
}
