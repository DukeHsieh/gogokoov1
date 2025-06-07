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
	case "cardClick":
		handleCardClick(gameRoom, client, message)
	case "flipCard":
		handleFlipCard(gameRoom, client, message)
	case "twoCardsClick":
		handleTwoCardsClick(gameRoom, client, message)
	default:
		log.Printf("[MEMORY] Unknown memory game message type: %s", message.Type)
	}
}

// handleCardClick processes card click messages
func handleCardClick(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[MEMORY] Processing cardClick from %s", client.Nickname)

	// Extract card data from message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[MEMORY] Invalid message data format")
		return
	}

	// Check if suit and value are directly in dataMap
	suit, suitOk := dataMap["suit"].(string)
	value, valueOk := dataMap["value"].(string)
	if !suitOk || !valueOk {
		// Try to get suit and value from nested data field
		if nestedData, exists := dataMap["data"].(map[string]interface{}); exists {
			if s, found := nestedData["suit"].(string); found {
				suit = s
				suitOk = true
			}
			if v, found := nestedData["value"].(string); found {
				value = v
				valueOk = true
			}
		}
	}

	if !suitOk || !valueOk {
		log.Printf("[MEMORY] Invalid suit or value in message data. Full message: %+v", dataMap)
		return
	}

	log.Printf("[MEMORY] Extracted suit: %s, value: %s from data: %+v", suit, value, dataMap)

	// Handle the card click
	HandleCardClick(gameRoom, client, suit, value)
}

// handleFlipCard processes flip card messages (alternative to cardClick)
func handleFlipCard(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[MEMORY] Processing flipCard from %s", client.Nickname)

	// Extract suit and value from message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[MEMORY] Invalid flipCard message data format")
		return
	}

	// Check if suit and value are directly in dataMap
	suit, suitOk := dataMap["suit"].(string)
	value, valueOk := dataMap["value"].(string)
	if !suitOk || !valueOk {
		// Try to get suit and value from nested data field
		if nestedData, exists := dataMap["data"].(map[string]interface{}); exists {
			if s, found := nestedData["suit"].(string); found {
				suit = s
				suitOk = true
			}
			if v, found := nestedData["value"].(string); found {
				value = v
				valueOk = true
			}
		}
	}

	if !suitOk || !valueOk {
		log.Printf("[MEMORY] Invalid suit or value in flipCard message data. Full message: %+v", dataMap)
		return
	}

	log.Printf("[MEMORY] Extracted suit: %s, value: %s from flipCard data: %+v", suit, value, dataMap)

	// Handle the card flip (same as card click)
	HandleCardClick(gameRoom, client, suit, value)
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
		"type":     "gameState",
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

	for client := range gameRoom.Clients {
		player := map[string]interface{}{
			"nickname": client.Nickname,
			"score":    client.Score,
			"isHost":   client.IsHost,
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
	numPairs := 8 // default value
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
		"type":    "gameClosed",
		"message": "Game was closed by the host",
	})

	log.Printf("[MEMORY] Game closed by host %s in room %s", client.Nickname, gameRoom.ID)
}

// handleTwoCardsClick processes two cards click messages
func handleTwoCardsClick(gameRoom *core.Room, client *core.Client, message core.Message) {
	log.Printf("[MEMORY] Processing twoCardsClick from %s", client.Nickname)

	// Extract cards from message data
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		log.Printf("[MEMORY] Invalid message data format")
		return
	}

	// Check if cards is directly in dataMap
	cards, ok := dataMap["cards"].([]interface{})
	if !ok {
		// Try to get cards from nested data field
		if nestedData, exists := dataMap["data"].(map[string]interface{}); exists {
			if cardsData, found := nestedData["cards"].([]interface{}); found {
				cards = cardsData
				ok = true
			}
		}
	}

	if !ok || len(cards) != 2 {
		log.Printf("[MEMORY] Invalid cards in message data. Expected 2 cards. Full message: %+v", dataMap)
		return
	}

	// Parse card data
	var cardData [2]struct {
		Suit       string
		Value      string
		PositionId int
	}

	for i, cardInterface := range cards {
		cardMap, ok := cardInterface.(map[string]interface{})
		if !ok {
			log.Printf("[MEMORY] Invalid card data format at index %d", i)
			return
		}

		// Extract Suit
		if suit, ok := cardMap["suit"].(string); ok {
			cardData[i].Suit = suit
		} else {
			log.Printf("[MEMORY] Invalid card suit type at index %d: %T", i, cardMap["suit"])
			return
		}

		// Extract Value
		if value, ok := cardMap["value"].(string); ok {
			cardData[i].Value = value
		} else {
			log.Printf("[MEMORY] Invalid card value type at index %d: %T", i, cardMap["value"])
			return
		}

		// Extract PositionId
		if positionId, ok := cardMap["positionId"].(float64); ok {
			cardData[i].PositionId = int(positionId)
		} else {
			log.Printf("[MEMORY] Invalid card positionId type at index %d: %T", i, cardMap["positionId"])
			return
		}
	}

	// Handle the two cards click
	HandleTwoCardsClick(gameRoom, client, cardData[0].Suit, cardData[0].Value, cardData[0].PositionId, cardData[1].Suit, cardData[1].Value, cardData[1].PositionId)
}