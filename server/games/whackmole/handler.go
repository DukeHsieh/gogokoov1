package whackmole

import (
	"log"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// HandleWhackAMoleGameMessage processes whack-a-mole game specific messages
func HandleWhackAMoleGameMessage(gameRoom *core.Room, client *core.Client, message core.Message) {
	switch message.Type {

	case "moleScoreUpdate":
		handleScoreUpdate(gameRoom, client, message)

	case "hostStartGame":
		handleHostStartGame(gameRoom, client, message)

	default:
		log.Printf("[WHACKMOLE] Unknown whack-a-mole game message type: %s", message.Type)
	}
}

// handleScoreUpdate processes score update messages from client
func handleScoreUpdate(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[WHACKMOLE] Processing scoreUpdate from %s", client.Nickname)

	// Get game instance from room
	gameInterface := gameRoom.GameData
	if gameInterface == nil {
		log.Printf("[WHACKMOLE] No active game in room %s", gameRoom.ID)
		return
	}

	// Extract score data from message
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[WHACKMOLE] Invalid message data format")
		return
	}

	// Extract total score
	totalScore, scoreOk := dataMap["totalScore"].(float64)
	if !scoreOk {
		log.Printf("[WHACKMOLE] Invalid totalScore in message data")
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

	log.Printf("[WHACKMOLE] Player %s updated total score to %d", client.Nickname, int(totalScore))
}

// handleHostStartGame handles game start from host
func handleHostStartGame(gameRoom *core.Room, client *core.Client, message core.Message) {
	if !client.IsHost {
		log.Printf("[WHACKMOLE] Non-host %s tried to start game", client.Nickname)
		return
	}

	log.Printf("[WHACKMOLE] Host %s starting game", client.Nickname)

	// Extract game settings from message
	settings := GameSettings{
		Duration:          60,   // Default 60 seconds
		MoleSpawnInterval: 1500, // Default 1.5 seconds
		MoleLifetime:      2000, // Default 2 seconds
		MoleCount:         9,    // Default 9 holes
	}

	// Try to extract settings from message data
	if dataMap, ok := message.Data.(map[string]interface{}); ok {
		if duration, exists := dataMap["duration"].(float64); exists {
			settings.Duration = int(duration)
		}
		if interval, exists := dataMap["moleSpawnInterval"].(float64); exists {
			settings.MoleSpawnInterval = int(interval)
		}
		if lifetime, exists := dataMap["moleLifetime"].(float64); exists {
			settings.MoleLifetime = int(lifetime)
		}
		if count, exists := dataMap["moleCount"].(float64); exists {
			settings.MoleCount = int(count)
		}
	}

	// Start the whack-a-mole game using the new logic function
	StartWhackAMoleGame(gameRoom, settings)
}
