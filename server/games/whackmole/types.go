package whackmole

// GameSettings represents the configuration for a whack-a-mole game
type GameSettings struct {
	Duration          int `json:"duration"`          // Game duration in seconds
	MoleSpawnInterval int `json:"moleSpawnInterval"` // Interval between mole spawns in milliseconds
	MoleLifetime      int `json:"moleLifetime"`      // How long a mole stays visible in milliseconds
	MoleCount         int `json:"moleCount"`         // Number of mole holes
}

// GameData represents the current state of the game
type GameData struct {
	TimeRemaining int         `json:"timeRemaining"`
	IsActive      bool        `json:"isActive"`
	Moles         []MoleState `json:"moles"`
}

// MoleHole represents a hole where moles can appear
type MoleHole struct {
	ID         int  `json:"id"`
	X          int  `json:"x"`          // X position as percentage (0-100)
	Y          int  `json:"y"`          // Y position as percentage (0-100)
	IsOccupied bool `json:"isOccupied"` // Whether a mole is currently in this hole
}

// MoleState represents a mole that has spawned
type MoleState struct {
	ID       string `json:"id"`       // Unique mole ID
	Position int    `json:"position"` // Hole ID where the mole is located
	SpawnTime int64 `json:"spawnTime"` // When the mole spawned (timestamp)
}

// PlayerScore represents a player's score for ranking
type PlayerScore struct {
	Nickname string `json:"nickname"`
	Score    int    `json:"score"`
	Rank     int    `json:"rank"`
	HitCount int    `json:"hitCount"`
}