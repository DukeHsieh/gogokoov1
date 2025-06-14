package whackmole

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"gaming-platform/core"
	"gaming-platform/platform/room"
)

// Game represents a whack-a-mole game instance
type Game struct {
	mu               sync.RWMutex
	RoomID           string
	Settings         GameSettings
	Data             GameData
	Players          map[string]*PlayerScore
	IsActive         bool
	StartTime        time.Time
	EndTime          time.Time
	moleHoles        []MoleHole
	gameTimer        *time.Timer
	timeUpdateTicker *time.Ticker
	onUpdate         func(roomID string, data interface{})
	onGameEnd        func(roomID string)
	onScoreUpdate    func(roomID string, players map[string]*PlayerScore)
	onTimeUpdate     func(timeLeft int)
}

// NewGame creates a new whack-a-mole game instance
func NewGame(roomID string, settings GameSettings) *Game {
	game := &Game{
		RoomID:     roomID,
		Settings:   settings,
		Players:    make(map[string]*PlayerScore),
		IsActive:   false,
	}
	
	// Initialize mole holes
	game.initializeMoleHoles()
	
	return game
}

// SetCallbacks sets the callback functions for game events
func (g *Game) SetCallbacks(
	onUpdate func(roomID string, data interface{}),
	onGameEnd func(roomID string),
	onScoreUpdate func(roomID string, players map[string]*PlayerScore),
	onTimeUpdate func(timeLeft int),
) {
	g.onUpdate = onUpdate
	g.onGameEnd = onGameEnd
	g.onScoreUpdate = onScoreUpdate
	g.onTimeUpdate = onTimeUpdate
}

// initializeMoleHoles creates the mole hole positions
func (g *Game) initializeMoleHoles() {
	g.moleHoles = make([]MoleHole, 0, g.Settings.MoleCount)
	
	// Calculate grid layout
	cols := int(float64(g.Settings.MoleCount)*0.8) // Slightly rectangular layout
	if cols < 3 {
		cols = 3
	}
	rows := (g.Settings.MoleCount + cols - 1) / cols
	
	holeID := 0
	for row := 0; row < rows && holeID < g.Settings.MoleCount; row++ {
		for col := 0; col < cols && holeID < g.Settings.MoleCount; col++ {
			// Calculate position as percentage (15% to 85% for x, 20% to 80% for y)
			x := 15 + (col * 70 / max(cols-1, 1))
			y := 20 + (row * 60 / max(rows-1, 1))
			
			g.moleHoles = append(g.moleHoles, MoleHole{
				ID:         holeID,
				X:          x,
				Y:          y,
				IsOccupied: false,
			})
			holeID++
		}
	}
}

// AddPlayer adds a player to the game
func (g *Game) AddPlayer(playerID, nickname string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	g.Players[playerID] = &PlayerScore{
		Nickname: nickname,
		Score:    0,
		Rank:     0,
		HitCount: 0,
	}
	
	// 通知主持人玩家加入
	if g.onUpdate != nil {
		g.onUpdate(g.RoomID, map[string]interface{}{
			"type": "playerJoined",
			"data": map[string]interface{}{
				"player": g.Players[playerID],
			},
		})
	}
}

// HandleMoleHit processes when a player hits a mole
func (g *Game) HandleMoleHit(playerID string, holeID int, score int) {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	if !g.IsActive {
		return
	}
	
	player, exists := g.Players[playerID]
	if !exists {
		return
	}
	
	// 更新玩家分數
	player.Score += 10 // 固定得分
	player.HitCount++
	
	// 通知分數更新
	if g.onScoreUpdate != nil {
		g.onScoreUpdate(g.RoomID, g.Players)
	}
	
	// 通知所有玩家分數更新
	if g.onUpdate != nil {
		g.onUpdate(g.RoomID, map[string]interface{}{
			"type": "scoreUpdate",
			"data": map[string]interface{}{
				"playerId": playerID,
				"score":    player.Score,
				"players":  g.Players,
			},
		})
	}
}

// Start begins the whack-a-mole game
func (g *Game) Start() error {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	if g.IsActive {
		return fmt.Errorf("game is already active")
	}
	
	g.IsActive = true
	g.StartTime = time.Now()
	g.EndTime = g.StartTime.Add(time.Duration(g.Settings.Duration) * time.Second)
	g.Data = GameData{
		TimeRemaining: g.Settings.Duration,
		IsActive:      true,
		Moles:         make([]MoleState, 0),
	}
	
	// Start game timer
	g.gameTimer = time.AfterFunc(time.Duration(g.Settings.Duration)*time.Second, func() {
		g.End()
	})
	
	// Start time update ticker (send time updates every second)
	g.startTimeUpdates()
	
	return nil
}

// startTimeUpdates begins sending time updates every second
func (g *Game) startTimeUpdates() {
	g.timeUpdateTicker = time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-g.timeUpdateTicker.C:
				if !g.IsActive {
					return
				}
				
				// Calculate remaining time
				now := time.Now()
				remaining := g.EndTime.Sub(now)
				timeLeft := int(remaining.Seconds())
				
				if timeLeft < 0 {
					timeLeft = 0
				}
				
				// Update game data
				g.mu.Lock()
				g.Data.TimeRemaining = timeLeft
				g.mu.Unlock()
				
				// Send time update to clients
				if g.onTimeUpdate != nil {
					g.onTimeUpdate(timeLeft)
				}
			}
		}
	}()
}

// HitMole handles a mole being hit by a player
func (g *Game) HitMole(playerID, nickname, moleID string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	if !g.IsActive {
		return false
	}
	
	// Update player score
	if g.Players[playerID] == nil {
		g.Players[playerID] = &PlayerScore{
			Nickname: nickname,
			Score:    0,
			HitCount: 0,
		}
	}
	
	g.Players[playerID].Score++
	g.Players[playerID].HitCount++
	
	// Update rankings
	g.updateRankings()
	
	// Notify about score update to all clients (including host)
	if g.onUpdate != nil {
		g.onUpdate(g.RoomID, map[string]interface{}{
			"type": "scoreUpdate",
			"data": map[string]interface{}{
				"playerId": playerID,
				"score":    g.Players[playerID].Score,
				"players":  g.Players, // Send all player scores for ranking on client
			},
		})
	}

	return true
}

// updateRankings calculates and updates player rankings
func (g *Game) updateRankings() {
	// Create slice for sorting
	players := make([]*PlayerScore, 0, len(g.Players))
	for _, player := range g.Players {
		players = append(players, player)
	}
	
	// Sort by score (descending)
	sort.Slice(players, func(i, j int) bool {
		return players[i].Score > players[j].Score
	})
	
	// Assign ranks
	for i, player := range players {
		player.Rank = i + 1
	}
}

// End stops the whack-a-mole game
func (g *Game) End() {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	if !g.IsActive {
		return
	}
	
	g.IsActive = false
	
	// Stop all timers
	if g.gameTimer != nil {
		g.gameTimer.Stop()
	}
	if g.timeUpdateTicker != nil {
		g.timeUpdateTicker.Stop()
	}
	
	// Clear moles and reset holes
	g.Data.Moles = make([]MoleState, 0)
	g.Data.IsActive = false
	// Mole occupation is now handled by client
	// for i := range g.moleHoles {
	// 	g.moleHoles[i].IsOccupied = false
	// }
	
	// Final ranking update
	g.updateRankings()
	
	// Notify game end
	if g.onGameEnd != nil {
		g.onGameEnd(g.RoomID)
	}
}



// GetPlayers returns the current player scores
func (g *Game) GetPlayers() map[string]*PlayerScore {
	g.mu.RLock()
	defer g.mu.RUnlock()
	
	// Create a copy to avoid race conditions
	players := make(map[string]*PlayerScore)
	for id, player := range g.Players {
		players[id] = &PlayerScore{
			Nickname: player.Nickname,
			Score:    player.Score,
			Rank:     player.Rank,
			HitCount: player.HitCount,
		}
	}
	
	return players
}





// RemovePlayer removes a player from the game
func (g *Game) RemovePlayer(playerID string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	delete(g.Players, playerID)
	g.updateRankings()
}

// ProcessMoleHit processes a mole hit from a player
func (g *Game) ProcessMoleHit(playerID, nickname, moleID string) bool {
	return g.HitMole(playerID, nickname, moleID)
}

// Stop stops the game
func (g *Game) Stop() {
	g.End()
}

// GetMoleHoles returns the mole holes configuration
func (g *Game) GetMoleHoles() []MoleHole {
	g.mu.RLock()
	defer g.mu.RUnlock()
	return g.moleHoles
}

// Helper function for max
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// StartWhackAMoleGame initializes and starts a whack-a-mole game
func StartWhackAMoleGame(gameRoom *core.Room, settings GameSettings) {
	log.Printf("[WHACKMOLE] Starting whack-a-mole game for room %s with settings: %+v", gameRoom.ID, settings)

	// Initialize game data
	gameData := GameData{
		TimeRemaining: settings.Duration,
		IsActive:      true,
		Moles:         []MoleState{},
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
	gameRoom.GameTime = gameData.TimeRemaining

	// Reset player scores
	for client := range gameRoom.PlayerClients {
		client.Score = 0
	}

	// Start game timer (countdown from duration to 0)
	gameRoom.Timer = time.NewTicker(1 * time.Second)
	go func() {
		timeRemaining := settings.Duration
		for {
			select {
			case <-gameRoom.Timer.C:
				timeRemaining--
				// Broadcast game time update every second
				room.BroadcastToRoom(gameRoom, map[string]interface{}{
					"type":     "gameTimeUpdate",
					"timeLeft": timeRemaining,
				})

				// Also send legacy timeUpdate for backward compatibility
				room.BroadcastToRoom(gameRoom, map[string]interface{}{
					"type":     "timeUpdate",
					"timeLeft": timeRemaining,
				})

				// Check if time is up
				if timeRemaining <= 0 {
					log.Printf("[WHACKMOLE] Time up for room %s, ending game", gameRoom.ID)
					// Handle game end logic here
					return
				}
			case <-gameRoom.StopChan:
				gameRoom.Timer.Stop()
				return
			}
		}
	}()

	// Create client game data with game settings
	clientGameData := map[string]interface{}{
		"gameSettings": settings,
		"gameTime":     settings.Duration,
	}

	// Broadcast game start to all clients with platformGameStarted message
	room.BroadcastToRoom(gameRoom, map[string]interface{}{
		"type":     "platformGameStarted",
		"gameType": "whackmole",
		"gameData": clientGameData,
		"message":  "Whack-a-mole game started!",
	})

	log.Printf("[WHACKMOLE] Whack-a-mole game started for room %s with settings: %+v", gameRoom.ID, settings)
}