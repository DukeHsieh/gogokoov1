// Package message handles WebSocket message processing
package message

import (
	"encoding/json"
	"log"

	"gaming-platform/core"
	"gaming-platform/games/memory"
	"gaming-platform/games/redenvelope"
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
	case "startGameWithNotification":
		// Handle combined game start with notification
		handleStartGameWithNotification(client, room, msg)
	case "hostStartGame":
		// Delegate to appropriate game handler based on game type
		data, dataOk := msg["data"].(map[string]interface{})
		if dataOk {
			if gameType, ok := data["gameType"].(string); ok {
			switch gameType {
			case "memory":
				memory.HandleHostStartGame(room, client, msg)
			case "redenvelope":
				// 将消息转换为core.Message格式以处理红包游戏
				coreMsg := core.Message{
					Type: "gameStart",
					Data: msg,
				}
				redenvelope.HandleRedEnvelopeGameMessage(room, client, coreMsg)
			default:
				log.Printf("[MESSAGE] Unknown game type for hostStartGame: %s", gameType)
			}
		} else {
			// Default to memory game for backward compatibility if gameType is not specified
			memory.HandleHostStartGame(room, client, msg)
		}
	} else {
		// Default to memory game for backward compatibility if msg["data"] is not a map
		memory.HandleHostStartGame(room, client, msg)
	}

	case "notifyPlatformPlayers":
		// Handle platform player notification
		handleNotifyPlatformPlayers(client, room, msg)
	case "cardClick", "flipCard", "twoCardsClick":
		// Convert message to core.Message format for memory game
		coreMsg := core.Message{
			Type: msgType,
			Data: msg,
		}
		// Delegate to memory game handler
		memory.HandleMemoryGameMessage(room, client, coreMsg)
	case "scoreUpdate":
		// Handle score update for both games
		handleScoreUpdate(client, room, msg)
	case "collectEnvelope", "gameStart", "gameEnd":
		// Convert message to core.Message format for red envelope game
		coreMsg := core.Message{
			Type: msgType,
			Data: msg,
		}
		// Delegate to red envelope game handler
		redenvelope.HandleRedEnvelopeGameMessage(room, client, coreMsg)
	case "hostCloseGame":
		// Delegate to appropriate game handler based on game type
		handleHostCloseGame(client, room)
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

	BroadcastMessage(room, platformPlayerListMsg)
	BroadcastMessage(room, legacyPlayerListMsg)
}

// handleNotifyPlatformPlayers handles platform player notification
func handleNotifyPlatformPlayers(client *core.Client, room *core.Room, msg map[string]interface{}) {
	log.Printf("[ROOM %s] Host %s notifying platform players", room.ID, client.Nickname)

	// Extract message content
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

	// Broadcast to all clients in the room
	BroadcastMessage(room, notificationMsg)
}

// handleStartGameWithNotification handles combined game start with platform notification
func handleStartGameWithNotification(client *core.Client, room *core.Room, msg map[string]interface{}) {
	log.Printf("[DEBUG] handleStartGameWithNotification called by %s in room %s", client.Nickname, room.ID)

	// First, send platform notification to all players
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

	// Create platform game started message
	platformGameStartedMsg := map[string]interface{}{
		"type": "platformGameStarted",
		"data": map[string]interface{}{
			"gameType": gameType,
			"roomId":   room.ID,
			"message":  message,
		},
	}

	// Broadcast notification to all clients in the room
	BroadcastMessage(room, notificationMsg)
	BroadcastMessage(room, platformGameStartedMsg)

	// Then start the game with the provided settings
	if gameType == "memory" {
		memory.HandleHostStartGame(room, client, msg)
	} else if gameType == "redenvelope" {
		coreMsg := core.Message{
			Type: "gameStart",
			Data: msg,
		}
		redenvelope.HandleRedEnvelopeGameMessage(room, client, coreMsg)
	}
}

// handleScoreUpdate handles score updates for different game types
func handleScoreUpdate(client *core.Client, room *core.Room, msg map[string]interface{}) {
	// Determine game type based on room state or message content
	gameType := determineGameType(room, msg)

	switch gameType {
	case "memory":
		// Convert message to core.Message format
		coreMsg := core.Message{
			Type: "scoreUpdate",
			Data: msg,
		}
		memory.HandleMemoryGameMessage(room, client, coreMsg)
	case "redenvelope":
		// Convert message to core.Message format
		coreMsg := core.Message{
			Type: "scoreUpdate",
			Data: msg,
		}
		redenvelope.HandleRedEnvelopeGameMessage(room, client, coreMsg)
	default:
		log.Printf("[WEBSOCKET] Unknown game type for scoreUpdate: %s", gameType)
	}
}

// handleHostCloseGame handles host closing game for different game types
func handleHostCloseGame(client *core.Client, room *core.Room) {
	// Determine game type based on room state
	gameType := determineGameType(room, nil)

	switch gameType {
	case "memory":
		memory.HandleHostCloseGame(room, client)
	case "redenvelope":
		// Convert to core.Message format
		coreMsg := core.Message{
			Type: "gameEnd",
			Data: map[string]interface{}{},
		}
		redenvelope.HandleRedEnvelopeGameMessage(room, client, coreMsg)
	default:
		log.Printf("[WEBSOCKET] Unknown game type for hostCloseGame: %s", gameType)
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

	// Check room game data type
	if room.GameData != nil {
		switch room.GameData.(type) {
		case *redenvelope.GameData:
			return "redenvelope"
		default:
			return "memory" // Default to memory game
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
