// Package memory handles memory game specific messages
package memory

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

// registerHandlers registers all memory game message handlers
func registerHandlers() {
	if registrar == nil {
		return
	}
	// Register memory game specific message types
	registrar.RegisterHandler("memory-scoreupdate", HandleMemoryGameMessage)
	// Register memory game start handler with specific message type
	registrar.RegisterHandler("memory-startgame", HandleMemoryHostStartGame)
}

// HandleMemoryGameMessage processes memory game specific messages
func HandleMemoryGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {
	case "memory-scoreupdate":
		handleScoreUpdate(gameRoom, client, message)
	default:
		log.Printf("[MEMORY] Unknown memory game message type: %s", message.Type)
	}
}

// HandleMemoryHostStartGame handles memory game start messages
func HandleMemoryHostStartGame(gameRoom *core.Room, client *core.Client, message core.Message) {
	// Extract message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[MEMORY] Invalid message data format")
		return
	}

	log.Printf("[MEMORY] Starting memory game for host %s", client.Nickname)
	// Call the existing memory game start handler
	HandleHostStartGame(gameRoom, client, dataMap)
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

		// Send updated leaderboard to host
		sendPlayerLeaderboardToHost(gameRoom)
	} else {
		log.Printf("[MEMORY] Ignoring score update for host player %s", client.Nickname)
	}
}

// sendPlayerLeaderboardToHost sends the current player leaderboard to the host
func sendPlayerLeaderboardToHost(gameRoom *core.Room) {
	if gameRoom.HostClient == nil {
		log.Printf("[MEMORY] No host found in room %s", gameRoom.ID)
		return
	}

	// Create leaderboard data
	type PlayerScore struct {
		Nickname string `json:"nickname"`
		Score    int    `json:"score"`
		IsHost   bool   `json:"isHost"`
	}

	var leaderboard []PlayerScore
	for client := range gameRoom.AllClients {
		leaderboard = append(leaderboard, PlayerScore{
			Nickname: client.Nickname,
			Score:    client.Score,
			IsHost:   client.IsHost,
		})
	}

	// Send leaderboard to host
	leaderboardMessage := map[string]interface{}{
		"type":        "memory-leaderboard",
		"leaderboard": leaderboard,
		"roomId":      gameRoom.ID,
	}

	room.BroadcastToHost(gameRoom, leaderboardMessage)
	log.Printf("[MEMORY] Sent leaderboard to host %s in room %s", gameRoom.HostClient.Nickname, gameRoom.ID)
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
