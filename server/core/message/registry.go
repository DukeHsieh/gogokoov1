package message

import (
	"log"
	"sync"

	"gaming-platform/core/interfaces"
)

// HandlerRegistry manages message type to handler mappings
type HandlerRegistry struct {
	handlers map[string]interfaces.MessageHandler
	mutex    sync.RWMutex
}

// Global registry instance
var registry = &HandlerRegistry{
	handlers: make(map[string]interfaces.MessageHandler),
}

// RegisterHandler registers a handler for a specific message type
func RegisterHandler(msgType string, handler interfaces.MessageHandler) {
	registry.mutex.Lock()
	defer registry.mutex.Unlock()
	
	if _, exists := registry.handlers[msgType]; exists {
		log.Printf("[REGISTRY] Warning: Overwriting existing handler for message type: %s", msgType)
	}
	
	registry.handlers[msgType] = handler
	log.Printf("[REGISTRY] Registered handler for message type: %s", msgType)
}

// GetHandler retrieves a handler for a specific message type
func GetHandler(msgType string) (interfaces.MessageHandler, bool) {
	registry.mutex.RLock()
	defer registry.mutex.RUnlock()
	
	handler, exists := registry.handlers[msgType]
	return handler, exists
}

// UnregisterHandler removes a handler for a specific message type
func UnregisterHandler(msgType string) {
	registry.mutex.Lock()
	defer registry.mutex.Unlock()
	
	delete(registry.handlers, msgType)
	log.Printf("[REGISTRY] Unregistered handler for message type: %s", msgType)
}

// ListRegisteredTypes returns all registered message types
func ListRegisteredTypes() []string {
	registry.mutex.RLock()
	defer registry.mutex.RUnlock()
	
	types := make([]string, 0, len(registry.handlers))
	for msgType := range registry.handlers {
		types = append(types, msgType)
	}
	return types
}