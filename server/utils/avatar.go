// Package utils provides utility functions for the gaming platform
package utils

import (
	"math/rand"
	"time"
)

// AnimalAvatars contains all available animal avatar names
var AnimalAvatars = []string{
	"cat",
	"dog",
	"rabbit",
	"bear",
	"fox",
	"panda",
	"lion",
	"tiger",
}

// GetRandomAvatar returns a random animal avatar name
func GetRandomAvatar() string {
	rand.Seed(time.Now().UnixNano())
	return AnimalAvatars[rand.Intn(len(AnimalAvatars))]
}

// GetAvatarByIndex returns an avatar by index (useful for deterministic assignment)
func GetAvatarByIndex(index int) string {
	if index < 0 || index >= len(AnimalAvatars) {
		return AnimalAvatars[0] // Default to cat
	}
	return AnimalAvatars[index]
}

// GetAvatarCount returns the total number of available avatars
func GetAvatarCount() int {
	return len(AnimalAvatars)
}