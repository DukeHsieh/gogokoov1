package interfaces

import "gaming-platform/core"

// MessageHandler defines the interface for message handlers
type MessageHandler func(room *core.Room, client *core.Client, message core.Message)

// GameStartHandler defines the interface for game-specific start handlers
type GameStartHandler func(room *core.Room, client *core.Client, message core.Message)

// RegistrationInterface defines the interface for handler registration
type RegistrationInterface interface {
	RegisterHandler(msgType string, handler MessageHandler)
	RegisterGameStartHandler(gameType string, handler GameStartHandler)
}