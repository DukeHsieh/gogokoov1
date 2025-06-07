// Package memory implements the memory card game logic
package memory

import (
	"encoding/json"
	"log"
	"math/rand"
	"sort"
	"time"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// GenerateCards creates a shuffled deck of memory cards with specified number of pairs
func GenerateCards(numPairs int) []Card {
	cards := []Card{}

	// Define suits and values
	suits := []string{"heart", "diamond", "club", "spade"}
	values := []string{"A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"}

	// Calculate how many unique cards we need
	totalUniqueCards := len(suits) * len(values) // 52 total unique cards
	if numPairs > totalUniqueCards {
		numPairs = totalUniqueCards // Cap at maximum available
		log.Printf("[MEMORY] Requested %d pairs exceeds maximum %d, using maximum", numPairs, totalUniqueCards)
	}

	// Generate the requested number of pairs
	pairsGenerated := 0
	for _, suit := range suits {
		for _, value := range values {
			if pairsGenerated >= numPairs {
				break
			}
			// Create two identical cards for each suit-value combination
			for i := 0; i < 2; i++ {
				cards = append(cards, Card{
					PositionId: 0, // Will be assigned after shuffling
					Suit:       suit,
					Value:      value,
					IsFlipped:  false,
					IsMatched:  false,
				})
			}
			pairsGenerated++
		}
		if pairsGenerated >= numPairs {
			break
		}
	}

	// Shuffle the cards
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(cards), func(i, j int) {
		cards[i], cards[j] = cards[j], cards[i]
	})

	// Assign position IDs after shuffling
	for i := range cards {
		cards[i].PositionId = i
	}

	log.Printf("[MEMORY] Generated %d cards (%d pairs)", len(cards), numPairs)
	return cards
}

// HandleCardClick processes a card click in the memory game
func HandleCardClick(gameRoom *core.Room, client *core.Client, suit, value string) {
	log.Printf("[MEMORY] Card click from %s: card %s %s", client.Nickname, suit, value)

	// Parse current game data
	var gameData GameData
	if gameRoom.GameData != nil {
		gameDataBytes, ok := gameRoom.GameData.([]byte)
		if !ok {
			log.Printf("Invalid game data type")
			return
		}
		if err := json.Unmarshal(gameDataBytes, &gameData); err != nil {
			log.Printf("Error parsing game data: %v", err)
			return
		}
	} else {
		log.Printf("No game data found")
		return
	}

	// Find the card by suit and value
	var cardIndex = -1
	for i, c := range gameData.Cards {
		if c.Suit == suit && c.Value == value && !c.IsFlipped && !c.IsMatched {
			cardIndex = i
			break
		}
	}

	if cardIndex == -1 {
		log.Printf("Card not found or already flipped/matched: %s %s", suit, value)
		return
	}

	card := &gameData.Cards[cardIndex]

	// Check if there are already 2 cards flipped
	flippedCount := 0
	for _, c := range gameData.Cards {
		if c.IsFlipped && !c.IsMatched {
			flippedCount++
		}
	}

	if flippedCount >= 2 {
		log.Printf("Too many cards flipped (%d), cannot flip card %s %s. Checking for matches first.", flippedCount, suit, value)
		// Check for matches first
		checkForMatches(gameRoom, &gameData, client)
		return
	}

	// Flip the card
	card.IsFlipped = true
	gameData.FlippedCards = append(gameData.FlippedCards, CardRef{Suit: suit, Value: value, PositionId: card.PositionId})

	// Log card details
	log.Printf("[MEMORY] Card clicked - Suit: %s, Value: %s", card.Suit, card.Value)

	// Update game data
	updatedGameData, err := json.Marshal(gameData)
	if err != nil {
		log.Printf("Error marshaling game data: %v", err)
		return
	}
	gameRoom.GameData = updatedGameData

	// Check if this is the second card flipped
	if len(gameData.FlippedCards) == 2 {
		// Find the other flipped card
		var otherCard *Card
		for i, c := range gameData.Cards {
			if c.IsFlipped && !c.IsMatched && i != cardIndex {
				otherCard = &gameData.Cards[i]
				break
			}
		}

		if otherCard != nil {
			// Broadcast both card flips to all clients in a single message
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type":  "cardsFlipped",
				"cards": []Card{*otherCard, *card},
				"player": client.Nickname,
			})
		}

		// Check for matches immediately
		checkForMatches(gameRoom, &gameData, client)
	} else {
		// Broadcast single card flip
		room.BroadcastToRoom(gameRoom, map[string]interface{}{
			"type":   "cardFlipped",
			"card":   *card,
			"player": client.Nickname,
		})
	}
}

// checkForMatches checks if the currently flipped cards match
func checkForMatches(gameRoom *core.Room, gameData *GameData, client *core.Client) {
	flippedCards := []*Card{}
	for i, card := range gameData.Cards {
		if card.IsFlipped && !card.IsMatched {
			flippedCards = append(flippedCards, &gameData.Cards[i])
		}
	}

	if len(flippedCards) != 2 {
		return
	}

	card1 := flippedCards[0]
	card2 := flippedCards[1]

	// Check if cards match (same suit and value)
	log.Printf("[MEMORY] Checking for match between card1.suit = %s and card2.suit = %s and card1.value = %s and card2.value = %s", card1.Suit, card2.Suit, card1.Value, card2.Value)
	if card1.Suit == card2.Suit && card1.Value == card2.Value {
		// Match found!
		card1.IsMatched = true
		card2.IsMatched = true

		// Only award points to non-host players
		if !client.IsHost {
			client.Score += 10 // Award points for match
		}

		log.Printf("[MEMORY] Match found by %s! Cards %s %s and %s %s", client.Nickname, card1.Suit, card1.Value, card2.Suit, card2.Value)

		// Broadcast match to all clients
		room.BroadcastToRoom(gameRoom, map[string]interface{}{
			"type":  "cardsMatched",
			"cards": []Card{*card1, *card2},
			"player": client.Nickname,
			"score":  client.Score,
		})

		// Broadcast updated player list when score changes
		room.BroadcastPlayerListUpdate(gameRoom)

		// Check if game is complete
		allMatched := true
		for _, card := range gameData.Cards {
			if !card.IsMatched {
				allMatched = false
				break
			}
		}

		if allMatched {
			HandleGameEnd(gameRoom)
		}
	} else {
		// No match, flip cards back after a delay
		log.Printf("[MEMORY] No match for cards %s %s and %s %s", card1.Suit, card1.Value, card2.Suit, card2.Value)

		// Flip cards back after 2 seconds
		go func() {
			time.Sleep(2 * time.Second)
			card1.IsFlipped = false
			card2.IsFlipped = false

			// Update game data
			updatedGameData, err := json.Marshal(gameData)
			if err != nil {
				log.Printf("Error marshaling game data: %v", err)
				return
			}
			gameRoom.GameData = updatedGameData

			// Broadcast cards flipped back
			room.BroadcastToRoom(gameRoom, map[string]interface{}{
				"type":  "cardsFlippedBack",
				"cards": []Card{*card1, *card2},
			})
		}()
	}

	// Clear flipped cards list
	gameData.FlippedCards = []CardRef{}

	// Update game data
	updatedGameData, err := json.Marshal(gameData)
	if err != nil {
		log.Printf("Error marshaling game data: %v", err)
		return
	}
	gameRoom.GameData = updatedGameData
}

// HandleGameEnd processes the end of a memory game
func HandleGameEnd(gameRoom *core.Room) {
	log.Printf("[MEMORY] Game ended for room %s", gameRoom.ID)

	gameRoom.GameEnded = true
	gameRoom.WaitingForPlayers = false

	// Stop the game timer
	if gameRoom.Timer != nil {
		gameRoom.Timer.Stop()
	}

	// Calculate final scores and rankings
	playerScores := CalculateScores(gameRoom)

	// Broadcast game end to all clients
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":    "gameEnded",
		"scores":  playerScores,
		"message": "Memory game completed!",
	})

	log.Printf("[MEMORY] Final scores for room %s: %+v", gameRoom.ID, playerScores)
}

// CalculateScores calculates and ranks player scores (excluding host)
func CalculateScores(gameRoom *core.Room) []PlayerScore {
	var playerScores []PlayerScore

	// Collect only non-host player scores
	for client := range gameRoom.Clients {
		// Skip host players, only include regular players in scoring
		if !client.IsHost {
			playerScores = append(playerScores, PlayerScore{
				Nickname: client.Nickname,
				Score:    client.Score,
			})
		}
	}

	// Sort by score (descending)
	sort.Slice(playerScores, func(i, j int) bool {
		return playerScores[i].Score > playerScores[j].Score
	})

	// Assign ranks
	for i := range playerScores {
		playerScores[i].Rank = i + 1
	}

	return playerScores
}

// StartMemoryGame initializes and starts a memory game
func StartMemoryGame(gameRoom *core.Room, numPairs int, gameTime int) {
	log.Printf("[MEMORY] Starting memory game in room %s with %d pairs and %d seconds", gameRoom.ID, numPairs, gameTime)

	// Generate cards for the game
	cards := GenerateCards(numPairs)

	// Initialize game data
	gameData := GameData{
		Cards:        cards,
		GameTime:     gameTime,
		FlippedCards: []CardRef{},
	}

	// Store game data in room
	gameDataBytes, err := json.Marshal(gameData)
	if err != nil {
		log.Printf("Error marshaling game data: %v", err)
		return
	}

	// Set game state
	gameRoom.GameData = gameDataBytes
	gameRoom.GameStarted = true
	gameRoom.GameEnded = false
	gameRoom.WaitingForPlayers = false
	gameRoom.GameTime = gameData.GameTime

	// Reset only non-host player scores
	for client := range gameRoom.Clients {
		// Only reset scores for regular players, not hosts
		if !client.IsHost {
			client.Score = 0
		}
	}

	// Start game timer
	gameRoom.Timer = time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-gameRoom.Timer.C:
				gameRoom.GameTime++
				// Broadcast time update every 10 seconds
				if gameRoom.GameTime%10 == 0 {
					room.BroadcastToRoom(gameRoom, map[string]interface{}{
						"type": "timeUpdate",
						"time": gameRoom.GameTime,
					})
				}
			case <-gameRoom.StopChan:
				gameRoom.Timer.Stop()
				return
			}
		}
	}()

	// Create client game data with full card details for game start
	clientGameData := map[string]interface{}{
		"cards": cards,
		"gameSettings": GameSettings{
			NumPairs: len(cards) / 2,
			GameTime: 0, // Will be updated by timer
		},
		"gameTime": 0,
	}

	// Broadcast game start to all clients with full game data
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "gameStarted",
		"gameData": clientGameData,
		"message":  "Memory game started!",
	})

	// Also send gameData message for compatibility
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "gameData",
		"gameData": clientGameData,
	})

	log.Printf("[MEMORY] Memory game started for room %s with %d cards", gameRoom.ID, len(cards))
}

// HandleTwoCardsClick processes two cards being clicked simultaneously
func HandleTwoCardsClick(gameRoom *core.Room, client *core.Client, suit1, value1 string, positionId1 int, suit2, value2 string, positionId2 int) {
	log.Printf("[MEMORY] Two cards click from %s: cards %s %s (pos %d) and %s %s (pos %d)", client.Nickname, suit1, value1, positionId1, suit2, value2, positionId2)

	// Parse current game data
	var gameData GameData
	if gameRoom.GameData != nil {
		gameDataBytes, ok := gameRoom.GameData.([]byte)
		if !ok {
			log.Printf("Invalid game data type")
			return
		}
		if err := json.Unmarshal(gameDataBytes, &gameData); err != nil {
			log.Printf("Error parsing game data: %v", err)
			return
		}
	} else {
		log.Printf("No game data found")
		return
	}

	// Find the cards by positionId
	var card1Index, card2Index = -1, -1
	for i, c := range gameData.Cards {
		if c.PositionId == positionId1 && !c.IsFlipped && !c.IsMatched {
			card1Index = i
		} else if c.PositionId == positionId2 && !c.IsFlipped && !c.IsMatched {
			card2Index = i
		}
	}

	if card1Index == -1 {
		log.Printf("Card not found or already flipped/matched: %s %s (pos %d)", suit1, value1, positionId1)
		return
	}
	if card2Index == -1 {
		log.Printf("Card not found or already flipped/matched: %s %s (pos %d)", suit2, value2, positionId2)
		return
	}

	if card1Index == card2Index {
		log.Printf("Cannot select the same card twice: %s %s (pos %d)", suit1, value1, positionId1)
		return
	}

	card1 := &gameData.Cards[card1Index]
	card2 := &gameData.Cards[card2Index]

	// Check if there are already flipped cards that need to be processed
	flippedCount := 0
	for _, c := range gameData.Cards {
		if c.IsFlipped && !c.IsMatched {
			flippedCount++
		}
	}

	if flippedCount > 0 {
		log.Printf("There are already %d cards flipped, cannot flip more cards", flippedCount)
		return
	}

	// Flip both cards
	card1.IsFlipped = true
	card2.IsFlipped = true
	gameData.FlippedCards = []CardRef{{Suit: suit1, Value: value1, PositionId: positionId1}, {Suit: suit2, Value: value2, PositionId: positionId2}}

	// Log card details
	log.Printf("[MEMORY] Card clicked - Suit: %s, Value: %s, PositionId: %d", card1.Suit, card1.Value, card1.PositionId)
	log.Printf("[MEMORY] Card clicked - Suit: %s, Value: %s, PositionId: %d", card2.Suit, card2.Value, card2.PositionId)

	// Update game data
	updatedGameData, err := json.Marshal(gameData)
	if err != nil {
		log.Printf("Error marshaling game data: %v", err)
		return
	}
	gameRoom.GameData = updatedGameData

	// Broadcast both card flips to all clients in a single message
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":  "cardsFlipped",
		"cards": []Card{*card1, *card2},
		"player": client.Nickname,
	})

	// Check for matches immediately
	checkForMatches(gameRoom, &gameData, client)
}
