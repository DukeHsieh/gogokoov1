package message

// Import all game modules and initialize their handlers
import (
	"gaming-platform/core/interfaces"
	memory "gaming-platform/games/memory"
	redenvelope "gaming-platform/games/redenvelope"
	whackmole "gaming-platform/games/whackmole"
)

// MessageRegistrar implements the RegistrationInterface for all game modules
type MessageRegistrar struct{}

// RegisterHandler registers a message handler
func (mr *MessageRegistrar) RegisterHandler(msgType string, handler interfaces.MessageHandler) {
	RegisterHandler(msgType, handler)
}

// RegisterGameStartHandler registers a game start handler
func (mr *MessageRegistrar) RegisterGameStartHandler(gameType string, handler interfaces.GameStartHandler) {
	RegisterGameStartHandler(gameType, handler)
}

// init initializes all game module handlers
func init() {
	registrar := &MessageRegistrar{}
	
	// Set the registrar for all game modules
	memory.SetRegistrar(registrar)
	redenvelope.SetRegistrar(registrar)
	whackmole.SetRegistrar(registrar)
}