// Package memory handles memory game specific messages
package memory

import (
	"encoding/json"
	"log"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// HandleMemoryGameMessage processes memory game specific messages
func HandleMemoryGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {
	case "scoreUpdate":
		handleScoreUpdate(gameRoom, client, message)
	default:
		log.Printf("[MEMORY] Unknown memory game message type: %s", message.Type)
	}
}

// handleScoreUpdate processes score update messages from client
func handleScoreUpdate(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[MEMORY] Processing scoreUpdate from %s", client.Nickname)

	// Extract score data from message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[MEMORY] Invalid message data format")
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
		log.Printf("[MEMORY] Invalid score in message data. Full message: %+v", dataMap)
		return
	}

	log.Printf("[MEMORY] Extracted score: %.0f from data: %+v", score, dataMap)

	// Update player score (only for non-host players)
	if !client.IsHost {
		client.Score = int(score)
		log.Printf("[MEMORY] Updated score for %s: %d", client.Nickname, client.Score)

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

		// Broadcast updated player list when score changes
		room.BroadcastPlayerListUpdate(gameRoom)
	} else {
		log.Printf("[MEMORY] Ignoring score update for host player %s", client.Nickname)
	}
}

// SendGameState sends the current memory game state to a client
func SendGameState(client *core.Client, gameRoom *core.Room) {
	if gameRoom.GameData == nil {
		log.Printf("[MEMORY] No game data available for room %s", gameRoom.ID)
		return
	}

	// Parse game data
	var gameData GameData
	gameDataBytes, ok := gameRoom.GameData.([]byte)
	if !ok {
		log.Printf("[MEMORY] Invalid game data type")
		return
	}
	if err := json.Unmarshal(gameDataBytes, &gameData); err != nil {
		log.Printf("[MEMORY] Error parsing game data: %v", err)
		return
	}

	// Send game state to client
	response := map[string]interface{}{
		"type":     "gameData",
		"gameData": gameData,
		"gameTime": gameRoom.GameTime,
		"players":  getPlayerList(gameRoom),
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("[MEMORY] Error marshaling game state: %v", err)
		return
	}

	client.Mutex.Lock()
	err = client.Conn.WriteMessage(1, responseBytes)
	client.Mutex.Unlock()

	if err != nil {
		log.Printf("[MEMORY] Error sending game state to %s: %v", client.Nickname, err)
	}
}

// getPlayerList creates a list of players with their scores
func getPlayerList(gameRoom *core.Room) []map[string]interface{} {
	players := []map[string]interface{}{}

	for client := range gameRoom.AllClients {
		player := map[string]interface{}{
			"nickname": client.Nickname,
			"score":    client.Score,
			"isHost":   client.IsHost,
			"avatar":   client.Avatar,
		}
		players = append(players, player)
	}

	return players
}

// HandleHostStartGame starts a memory game when the host initiates it
func HandleHostStartGame(gameRoom *core.Room, client *core.Client, msgData map[string]interface{}) {
	if !client.IsHost {
		log.Printf("[MEMORY] Non-host %s tried to start game in room %s", client.Nickname, gameRoom.ID)
		return
	}

	if gameRoom.GameStarted {
		log.Printf("[MEMORY] Game already started in room %s", gameRoom.ID)
		return
	}

	if gameRoom.TotalPlayers < 1 {
		log.Printf("[MEMORY] Not enough players to start game in room %s", gameRoom.ID)
		return
	}

	// Extract game settings from message
	numPairs := 8  // default value
	gameTime := 60 // default value

	if pairs, ok := msgData["numPairs"].(float64); ok {
		numPairs = int(pairs)
	}
	if time, ok := msgData["gameTime"].(float64); ok {
		gameTime = int(time)
	}

	log.Printf("[MEMORY] Starting game with %d pairs and %d seconds", numPairs, gameTime)

	// Start the memory game with settings
	StartMemoryGame(gameRoom, numPairs, gameTime)
}

// HandleHostCloseGame closes a memory game when the host ends it
func HandleHostCloseGame(gameRoom *core.Room, client *core.Client) {
	if !client.IsHost {
		log.Printf("[MEMORY] Non-host %s tried to close game in room %s", client.Nickname, gameRoom.ID)
		return
	}

	if !gameRoom.GameStarted {
		log.Printf("[MEMORY] No game to close in room %s", gameRoom.ID)
		return
	}

	// End the game
	HandleGameEnd(gameRoom)

	// Broadcast game closed message
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":    "gameEnded",
		"message": "Game was closed by the host",
	})

	log.Printf("[MEMORY] Game closed by host %s in room %s", client.Nickname, gameRoom.ID)
}
