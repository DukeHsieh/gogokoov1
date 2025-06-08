// Package memory implements the memory card game
package memory

// Card represents a memory card in the game
type Card struct {
	PositionId int    `json:"positionId"` // 卡片位置ID，用於客戶端翻轉效果
	Suit       string `json:"suit"`       // 花色: heart, diamond, club, spade
	Value      string `json:"value"`      // 點數: A, 2-10, J, Q, K
	IsFlipped  bool   `json:"isFlipped"`
	IsMatched  bool   `json:"isMatched"`
}

// GameData represents the current memory game state
type GameData struct {
	Cards        []Card    `json:"cards"`
	GameTime     int       `json:"gameTime"`
	FlippedCards []CardRef `json:"flippedCards"`
}

// CardRef represents a reference to a card using suit, value and position
type CardRef struct {
	Suit       string `json:"suit"`
	Value      string `json:"value"`
	PositionId int    `json:"positionId"`
}

// GameSettings represents game configuration sent to clients
type GameSettings struct {
	NumPairs int `json:"numPairs"`
	GameTime int `json:"gameTime"`
}

// ClientGameData represents the game data sent to clients (without full card details)
type ClientGameData struct {
	GameSettings GameSettings `json:"gameSettings"`
	GameTime     int          `json:"gameTime"`
}

// PlayerScore represents a player's score for ranking
type PlayerScore struct {
	Nickname string `json:"nickname"`
	Score    int    `json:"score"`
	Rank     int    `json:"rank"`
}
