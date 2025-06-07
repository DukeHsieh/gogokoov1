// Package room manages game rooms and client connections
package room

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"gaming-platform/core"
)

// Global rooms storage
var (
	rooms      = make(map[string]*core.Room)
	roomsMutex = sync.RWMutex{}
)

// CreateRoom creates a new room with the given ID
func CreateRoom(roomID string) *core.Room {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	room := &core.Room{
		ID:                roomID,
		HostClient:        nil,
		Clients:           make(map[*core.Client]bool),
		GameTime:          0,
		TotalPlayers:      0,
		PlayersReady:      make(map[string]bool),
		WaitingForPlayers: true,
		GameStarted:       false,
		GameEnded:         false,
		Timer:             nil,
		ReconnectionChan:  make(chan core.ReconnectionRequest, 10),
		StopChan:          make(chan bool, 1),
	}

	rooms[roomID] = room
	log.Printf("[ROOM %s] Room created.", roomID)
	
	// Start the room's reconnection handler goroutine
	go handleReconnections(room)
	return room
}

// GetOrCreateRoom gets a room by ID, creates if it doesn't exist
func GetOrCreateRoom(roomID string) *core.Room {
	roomsMutex.RLock()
	room, exists := rooms[roomID]
	roomsMutex.RUnlock()

	if !exists {
		return CreateRoom(roomID)
	}
	return room
}

// GetRoom gets a room by ID
func GetRoom(roomID string) (*core.Room, bool) {
	roomsMutex.RLock()
	defer roomsMutex.RUnlock()
	room, exists := rooms[roomID]
	return room, exists
}

// RegisterClient adds a client to a room
func RegisterClient(room *core.Room, client *core.Client) {
	log.Printf("[ROOM %s] Registering client %s (IsHost: %t)", room.ID, client.Nickname, client.IsHost)

	// Check if this is a reconnection attempt
	if room.GameStarted {
		// Try to reconnect
		reconnectReq := core.ReconnectionRequest{
			Client:   client,
			Response: make(chan bool, 1),
		}

		select {
		case room.ReconnectionChan <- reconnectReq:
			// Wait for response
			select {
			case success := <-reconnectReq.Response:
				if success {
					log.Printf("[ROOM %s] Client %s successfully reconnected", room.ID, client.Nickname)
					return
				} else {
					log.Printf("[ROOM %s] Client %s reconnection failed", room.ID, client.Nickname)
				}
			case <-time.After(5 * time.Second):
				log.Printf("[ROOM %s] Client %s reconnection timeout", room.ID, client.Nickname)
			}
		default:
			log.Printf("[ROOM %s] Reconnection channel full for client %s", room.ID, client.Nickname)
		}
	}

	// Add client to room
	room.Clients[client] = true
	room.TotalPlayers = len(room.Clients)

	// Set host if this is the first client or if client is designated as host
	if room.HostClient == nil || client.IsHost {
		room.HostClient = client
		client.IsHost = true
		log.Printf("[ROOM %s] %s is now the host", room.ID, client.Nickname)
	}

	log.Printf("[ROOM %s] Client %s registered. Total players: %d", room.ID, client.Nickname, room.TotalPlayers)
}

// UnregisterClient removes a client from a room
func UnregisterClient(room *core.Room, client *core.Client) {
	log.Printf("[ROOM %s] Unregistering client %s", room.ID, client.Nickname)

	delete(room.Clients, client)
	room.TotalPlayers = len(room.Clients)

	// If the host left, assign a new host
	if room.HostClient == client {
		room.HostClient = nil
		for c := range room.Clients {
			room.HostClient = c
			c.IsHost = true
			log.Printf("[ROOM %s] %s is now the new host", room.ID, c.Nickname)
			break
		}
	}

	// Clean up empty rooms
	if room.TotalPlayers == 0 {
		log.Printf("[ROOM %s] Room is empty, cleaning up", room.ID)
		room.StopChan <- true
		roomsMutex.Lock()
		delete(rooms, room.ID)
		roomsMutex.Unlock()
	}

	log.Printf("[ROOM %s] Client %s unregistered. Total players: %d", room.ID, client.Nickname, room.TotalPlayers)
}

// handleReconnections handles reconnection requests for a room
func handleReconnections(room *core.Room) {
	log.Printf("[ROOM %s] Starting reconnection handler", room.ID)
	for {
		select {
		case req := <-room.ReconnectionChan:
			log.Printf("[ROOM %s] Processing reconnection request for %s", room.ID, req.Client.Nickname)
			
			// Check if a client with the same nickname exists
			var existingClient *core.Client
			for client := range room.Clients {
				if client.Nickname == req.Client.Nickname {
					existingClient = client
					break
				}
			}

			if existingClient != nil {
				// Replace the old connection with the new one
				log.Printf("[ROOM %s] Replacing connection for %s", room.ID, req.Client.Nickname)
				
				// Close old connection
				existingClient.Conn.Close()
				
				// Update connection and preserve game state
				existingClient.Conn = req.Client.Conn
				
				// Update host status if needed
				if room.HostClient == existingClient {
					existingClient.IsHost = true
				}
				
				req.Response <- true
			} else {
				// No existing client found, treat as new connection
				log.Printf("[ROOM %s] No existing client found for %s, treating as new connection", room.ID, req.Client.Nickname)
				req.Response <- false
			}
			
		case <-room.StopChan:
			log.Printf("[ROOM %s] Stopping reconnection handler", room.ID)
			return
		}
	}
}

// BroadcastToRoom sends a message to all clients in a room
func BroadcastToRoom(room *core.Room, message map[string]interface{}) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	for client := range room.Clients {
		client.Mutex.Lock()
		err := client.Conn.WriteMessage(websocket.TextMessage, messageBytes)
		client.Mutex.Unlock()
		if err != nil {
			log.Printf("Error broadcasting to %s: %v", client.Nickname, err)
		}
	}
}

// BroadcastPlayerListUpdate broadcasts player list update to all clients
func BroadcastPlayerListUpdate(room *core.Room) {
	players := []core.Player{}

	// Add host if exists
	if room.HostClient != nil {
		players = append(players, core.Player{
			Nickname: room.HostClient.Nickname,
			ID:       room.HostClient.Nickname, // Use nickname as ID for simplicity
			IsHost:   true,
			Score:    room.HostClient.Score,
		})
	}

	// Add other clients
	for client := range room.Clients {
		if client != room.HostClient {
			players = append(players, core.Player{
				Nickname: client.Nickname,
				ID:       client.Nickname,
				IsHost:   false,
				Score:    client.Score,
			})
		}
	}

	playerListMsg := map[string]interface{}{
		"type": "playerListUpdate",
		"data": map[string]interface{}{
			"players": players,
		},
	}

	BroadcastToRoom(room, playerListMsg)
}

// GetRoomList returns a list of all active rooms
func GetRoomList() []string {
	roomsMutex.RLock()
	defer roomsMutex.RUnlock()

	roomList := make([]string, 0, len(rooms))
	for roomID := range rooms {
		roomList = append(roomList, roomID)
	}
	return roomList
}