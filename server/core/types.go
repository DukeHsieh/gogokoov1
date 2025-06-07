// Package core defines the core types and structures for the gaming platform
package core

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a connected player
type Client struct {
	Conn         *websocket.Conn `json:"-"`
	Nickname     string          `json:"nickname"`
	RoomID       string          `json:"roomId"`
	IsHost       bool            `json:"isHost"`
	Score        int             `json:"score"`
	Avatar       string          `json:"avatar"`
	GameFinished bool            `json:"gameFinished"`
	Mutex        sync.RWMutex    `json:"-"`
}

// GameSettings represents game configuration
type GameSettings struct {
	NumPairs     int `json:"numPairs"`
	GameDuration int `json:"gameDuration"`
}

// ReconnectionRequest represents a reconnection operation
type ReconnectionRequest struct {
	Client   *Client
	Response chan bool
}

// Room represents a game room
type Room struct {
	ID                string                    `json:"id"`
	HostClient        *Client                   `json:"hostClient,omitempty"`
	Clients           map[*Client]bool          `json:"-"`
	GameTime          int                       `json:"gameTime"`
	TotalPlayers      int                       `json:"totalPlayers"`
	PlayersReady      map[string]bool           `json:"playersReady"`
	WaitingForPlayers bool                      `json:"waitingForPlayers"`
	GameStarted       bool                      `json:"gameStarted"`
	GameEnded         bool                      `json:"gameEnded"`
	Timer             *time.Ticker              `json:"-"`
	ReconnectionChan  chan ReconnectionRequest `json:"-"`
	StopChan          chan bool                 `json:"-"`
	Mutex             sync.RWMutex              `json:"-"`
	// Game-specific data will be handled by game modules
	GameData          interface{}               `json:"gameData,omitempty"`
}

// Message represents a WebSocket message
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data,omitempty"`
}

// Player represents player information for API responses
type Player struct {
	Nickname string `json:"nickname"`
	ID       string `json:"id"`
	IsHost   bool   `json:"isHost"`
	Score    int    `json:"score"`
	Avatar   string `json:"avatar"`
}

// PlayerListResponse represents the response for player list API
type PlayerListResponse struct {
	Players []Player `json:"players"`
}

// RoomInfoResponse represents the response for room info API
type RoomInfoResponse struct {
	RoomID           string `json:"roomId"`
	TotalPlayers     int    `json:"totalPlayers"`
	WaitingForPlayers bool   `json:"waitingForPlayers"`
	GameStarted      bool   `json:"gameStarted"`
	GameEnded        bool   `json:"gameEnded"`
}