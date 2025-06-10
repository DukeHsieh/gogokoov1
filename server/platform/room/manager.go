// Package room manages game rooms and client connections
package room

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"gaming-platform/core"

	"github.com/gorilla/websocket"
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
		PlayerClients:     make(map[*core.Client]bool), // Only non-host players
		AllClients:        make(map[*core.Client]bool), // All clients for backward compatibility
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

// RegisterClient adds a client to a room with separated storage
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

	// Add client to appropriate storage
	if client.IsHost || room.HostClient == nil {
		// Set as host
		room.HostClient = client
		client.IsHost = true
		log.Printf("[ROOM %s] %s is now the host", room.ID, client.Nickname)
	} else {
		// Add to player storage
		room.PlayerClients[client] = true
		log.Printf("[ROOM %s] %s added to player storage", room.ID, client.Nickname)
	}

	// Add to all clients for backward compatibility
	room.AllClients[client] = true
	room.TotalPlayers = len(room.AllClients)

	log.Printf("[ROOM %s] Client %s registered. Total players: %d, Host: %v, Players: %d", 
		room.ID, client.Nickname, room.TotalPlayers, room.HostClient != nil, len(room.PlayerClients))

	// Only broadcast player joined notification for non-host players
	if !client.IsHost {
		playerJoinedMsg := map[string]interface{}{
			"type": "playerJoined",
			"data": map[string]interface{}{
				"player": core.Player{
					Nickname: client.Nickname,
					ID:       client.Nickname,
					IsHost:   false,
					Score:    client.Score,
					Avatar:   client.Avatar,
				},
				"totalPlayers": len(room.PlayerClients), // 只計算玩家
			},
		}
		// Broadcast to all clients
		BroadcastToAllClients(room, playerJoinedMsg)
	}

	// Always broadcast updated player list
	broadcastPlayerListUpdate(room)
}

// UnregisterClient removes a client from a room with separated storage
func UnregisterClient(room *core.Room, client *core.Client) {
	log.Printf("[ROOM %s] Unregistering client %s (IsHost: %t)", room.ID, client.Nickname, client.IsHost)

	// Remove from appropriate storage
	if client.IsHost && room.HostClient == client {
		// Remove host
		room.HostClient = nil
		log.Printf("[ROOM %s] Host %s removed", room.ID, client.Nickname)
		
		// Assign a new host from players if available
		for c := range room.PlayerClients {
			// Move player to host
			delete(room.PlayerClients, c)
			room.HostClient = c
			c.IsHost = true
			log.Printf("[ROOM %s] %s is now the new host", room.ID, c.Nickname)
			break
		}
	} else {
		// Remove from player storage
		delete(room.PlayerClients, client)
		log.Printf("[ROOM %s] Player %s removed from player storage", room.ID, client.Nickname)
	}

	// Remove from all clients
	delete(room.AllClients, client)
	room.TotalPlayers = len(room.AllClients)

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

// handleReconnections handles reconnection requests for a room with separated storage
func handleReconnections(room *core.Room) {
	log.Printf("[ROOM %s] Starting reconnection handler", room.ID)
	for {
		select {
		case req := <-room.ReconnectionChan:
			log.Printf("[ROOM %s] Processing reconnection request for %s", room.ID, req.Client.Nickname)

			// Check if a client with the same nickname exists in all clients
			var existingClient *core.Client
			for client := range room.AllClients {
				if client.Nickname == req.Client.Nickname {
					existingClient = client
					break
				}
			}

			if existingClient != nil {
				// Replace the old connection with the new one
				log.Printf("[ROOM %s] Replacing connection for %s (IsHost: %t)", room.ID, req.Client.Nickname, existingClient.IsHost)

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

// BroadcastToRoom sends a message to all clients in a room (backward compatibility)
func BroadcastToRoom(room *core.Room, message map[string]interface{}) {
	BroadcastToAllClients(room, message)
}

// BroadcastToAllClients sends a message to all clients (host + players)
func BroadcastToAllClients(room *core.Room, message map[string]interface{}) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	for client := range room.AllClients {
		client.Mutex.Lock()
		err := client.Conn.WriteMessage(websocket.TextMessage, messageBytes)
		client.Mutex.Unlock()
		if err != nil {
			log.Printf("Error broadcasting to %s: %v", client.Nickname, err)
		}
	}
}

// BroadcastToHost sends a message only to the host
func BroadcastToHost(room *core.Room, message map[string]interface{}) {
	if room.HostClient == nil {
		log.Printf("[ROOM %s] No host to broadcast to", room.ID)
		return
	}

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling host message: %v", err)
		return
	}

	room.HostClient.Mutex.Lock()
	err = room.HostClient.Conn.WriteMessage(websocket.TextMessage, messageBytes)
	room.HostClient.Mutex.Unlock()
	if err != nil {
		log.Printf("Error broadcasting to host %s: %v", room.HostClient.Nickname, err)
	}
}

// BroadcastToPlayers sends a message only to players (excluding host)
func BroadcastToPlayers(room *core.Room, message map[string]interface{}) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling player message: %v", err)
		return
	}

	for client := range room.PlayerClients {
		client.Mutex.Lock()
		err := client.Conn.WriteMessage(websocket.TextMessage, messageBytes)
		client.Mutex.Unlock()
		if err != nil {
			log.Printf("Error broadcasting to player %s: %v", client.Nickname, err)
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
			Avatar:   room.HostClient.Avatar,
		})
	}

	// Add player clients
	for client := range room.PlayerClients {
		players = append(players, core.Player{
			Nickname: client.Nickname,
			ID:       client.Nickname,
			IsHost:   false,
			Score:    client.Score,
			Avatar:   client.Avatar,
		})
	}

	playerListMsg := map[string]interface{}{
		"type": "playerListUpdate",
		"data": map[string]interface{}{
			"players": players,
		},
	}

	BroadcastToAllClients(room, playerListMsg)
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

// broadcastMessage sends a message to all clients in a room
func broadcastMessage(room *core.Room, message map[string]interface{}) {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	for client := range room.AllClients {
		client.Mutex.Lock()
		err := client.Conn.WriteMessage(websocket.TextMessage, messageBytes)
		client.Mutex.Unlock()
		if err != nil {
			log.Printf("Error broadcasting to %s: %v", client.Nickname, err)
		}
	}
}

// broadcastPlayerListUpdate broadcasts player list update to all clients
// Only includes non-host players as hosts should not be displayed in the player list
func broadcastPlayerListUpdate(room *core.Room) {
	players := []core.Player{}

	// Only add player clients (主持人不顯示在玩家列表中)
	for client := range room.PlayerClients {
		players = append(players, core.Player{
			Nickname: client.Nickname,
			ID:       client.Nickname,
			IsHost:   false,
			Score:    client.Score,
			Avatar:   client.Avatar,
		})
	}

	playerListMsg := map[string]interface{}{
		"type": "playerListUpdate",
		"data": map[string]interface{}{
			"players": players,
		},
	}

	broadcastMessage(room, playerListMsg)
}
