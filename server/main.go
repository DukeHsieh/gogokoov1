package main

import (
	"log"
	"net/http"

	"gaming-platform/core/websocket"
	"gaming-platform/platform/api"
	// Import core message to trigger game handler registration
	_ "gaming-platform/core/message"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Starting Gaming Platform Server...")

	// Create Gin router
	r := gin.Default()

	// Enable CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Serve static files
	r.Static("/static", "./static")
	r.StaticFile("/", "./static/index.html")

	// API routes
	r.GET("/health", api.HealthCheck)
	r.GET("/api/rooms/:roomId/players", api.GetPlayerList)
	r.GET("/api/rooms/:roomId/info", api.GetRoomInfo)
	r.GET("/api/rooms", api.GetRoomList)

	// WebSocket endpoint
	r.GET("/ws", gin.WrapH(http.HandlerFunc(websocket.HandleWebSocketConnection)))

	log.Println("Server starting on :8080")
	log.Println("Available endpoints:")
	log.Println("  - WebSocket: ws://localhost:8080/ws")
	log.Println("  - Health Check: http://localhost:8080/health")
	log.Println("  - Room API: http://localhost:8080/api/rooms")
	log.Println("  - Static Files: http://localhost:8080/static")
	log.Println("  - Main Page: http://localhost:8080/")

	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
