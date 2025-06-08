// Package api handles HTTP API endpoints for the gaming platform
package api

import (
	"fmt"
	"log"
	"net/http"

	"gaming-platform/core"
	"gaming-platform/platform/room"

	"github.com/gin-gonic/gin"
)

// HealthCheck handles health check requests
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Gaming platform server is running",
	})
}

// GetPlayerList returns the player list for a specific room
func GetPlayerList(c *gin.Context) {
	roomID := c.Param("roomId")
	log.Printf("[API] Getting player list for room %s", roomID)

	gameRoom, exists := room.GetRoom(roomID)
	if !exists {
		c.JSON(http.StatusOK, core.PlayerListResponse{
			Players: []core.Player{},
		})
		return
	}

	players := []core.Player{}

	// Add host if exists
	if gameRoom.HostClient != nil {
		players = append(players, core.Player{
			Nickname: gameRoom.HostClient.Nickname,
			ID:       fmt.Sprintf("%p", gameRoom.HostClient.Conn),
			IsHost:   true,
			Score:    gameRoom.HostClient.Score,
			Avatar:   gameRoom.HostClient.Avatar,
		})
	}

	// Add other clients
	for client := range gameRoom.Clients {
		if client != gameRoom.HostClient {
			players = append(players, core.Player{
				Nickname: client.Nickname,
				ID:       fmt.Sprintf("%p", client.Conn),
				IsHost:   false,
				Score:    client.Score,
				Avatar:   client.Avatar,
			})
		}
	}

	log.Printf("[API] Returning %d players for room %s", len(players), roomID)
	c.JSON(http.StatusOK, core.PlayerListResponse{
		Players: players,
	})
}

// GetRoomInfo returns information about a specific room
func GetRoomInfo(c *gin.Context) {
	roomID := c.Param("roomId")
	log.Printf("[API] Getting room info for room %s", roomID)

	gameRoom, exists := room.GetRoom(roomID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Room not found",
		})
		return
	}

	roomInfo := core.RoomInfoResponse{
		RoomID:            gameRoom.ID,
		TotalPlayers:      gameRoom.TotalPlayers,
		WaitingForPlayers: gameRoom.WaitingForPlayers,
		GameStarted:       gameRoom.GameStarted,
		GameEnded:         gameRoom.GameEnded,
	}

	log.Printf("[API] Returning room info for room %s: %+v", roomID, roomInfo)
	c.JSON(http.StatusOK, roomInfo)
}

// GetRoomList returns a list of all active rooms
func GetRoomList(c *gin.Context) {
	log.Printf("[API] Getting room list")

	roomList := room.GetRoomList()

	c.JSON(http.StatusOK, gin.H{
		"rooms": roomList,
		"count": len(roomList),
	})
}
