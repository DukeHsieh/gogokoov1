// Package websocket handles WebSocket connections and communication
package websocket

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"gaming-platform/core"
	"gaming-platform/platform/room"
	"gaming-platform/core/message"
	"gaming-platform/utils"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin
		return true
	},
}

// HandleWebSocketConnection handles new WebSocket connections
func HandleWebSocketConnection(w http.ResponseWriter, r *http.Request) {
	log.Printf("[WEBSOCKET] New WebSocket connection attempt from %s", r.RemoteAddr)
	
	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WEBSOCKET] WebSocket upgrade error from %s: %v", r.RemoteAddr, err)
		return
	}
	defer conn.Close()
	log.Printf("[WEBSOCKET] WebSocket connection successfully upgraded from %s", r.RemoteAddr)

	// Extract parameters from query string
	query := r.URL.Query()
	log.Printf("[WEBSOCKET] Query parameters: %v", query)
	
	roomID := query.Get("roomId")
	originalRoomID := roomID
	if roomID == "" {
		roomID = "default"
		log.Printf("[WEBSOCKET] No roomId provided, using default room")
	}
	
	nickname := query.Get("nickname")
	originalNickname := nickname
	if nickname == "" {
		nickname = "Anonymous"
		log.Printf("[WEBSOCKET] No nickname provided, using Anonymous")
	}
	
	isHost := query.Get("isHost") == "true"
	log.Printf("[WEBSOCKET] Connection details - RoomID: %s (original: %s), Nickname: %s (original: %s), IsHost: %t", 
		roomID, originalRoomID, nickname, originalNickname, isHost)

	// Create client
	client := &core.Client{
		Conn:     conn,
		Nickname: nickname,
		RoomID:   roomID,
		IsHost:   isHost,
		Score:    0,
		Avatar:   utils.GetRandomAvatar(),
	}

	// Get or create room
	gameRoom := room.GetOrCreateRoom(roomID)
	log.Printf("[WEBSOCKET] Got room %s for client %s", roomID, nickname)

	// Register client to room
	room.RegisterClient(gameRoom, client)

	// Handle client messages
	for {
		_, msgData, err := conn.ReadMessage()
		if err != nil {
			log.Printf("[WEBSOCKET] Read error from %s: %v", nickname, err)
			break
		}

		// Handle the message
		message.HandleMessage(client, gameRoom, msgData)
	}

	// Unregister client when connection closes
	room.UnregisterClient(gameRoom, client)
	log.Printf("[WEBSOCKET] Client %s disconnected from room %s", nickname, roomID)
}