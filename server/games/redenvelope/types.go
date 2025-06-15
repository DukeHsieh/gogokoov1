package redenvelope

import "time"

// GameSettings represents configurable game parameters
type GameSettings struct {
	Duration         int `json:"duration"`         // Game duration in seconds
	SpawnInterval    int `json:"spawnInterval"`    // Envelope spawn interval in ms
	EnvelopeLifetime int `json:"envelopeLifetime"` // How long envelopes stay on screen in ms
	EnvelopeCount    int `json:"envelopeCount"`    // Max envelopes on screen
}

// GameData represents the current state of the red envelope game
type GameData struct {
	TimeLeft int  `json:"timeLeft"` // Time remaining in seconds
	Active   bool `json:"active"`   // Whether the game is currently active
}

// RedEnvelope represents a red envelope in the game
type RedEnvelope struct {
	ID       string  `json:"id"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Value    int     `json:"value"`
	SpawnTime time.Time `json:"spawnTime"`
}

// PlayerScore represents a player's score and ranking
type PlayerScore struct {
	Nickname       string `json:"nickname"`
	Score          int    `json:"score"`
	Rank           int    `json:"rank"`
	CollectedCount int    `json:"collectedCount"`
}