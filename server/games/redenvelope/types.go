package redenvelope

import "time"

// RedEnvelope represents a red envelope in the game
type RedEnvelope struct {
	ID       string  `json:"id"`       // 紅包唯一ID
	X        float64 `json:"x"`        // X座標位置
	Y        float64 `json:"y"`        // Y座標位置
	Value    int     `json:"value"`    // 紅包價值
	Size     string  `json:"size"`     // 紅包大小: small, medium, large
	Speed    float64 `json:"speed"`    // 下降速度
	Created  int64   `json:"created"`  // 創建時間戳
	Collected bool   `json:"collected"` // 是否已被收集
}

// GameData represents the current red envelope game state
type GameData struct {
	Envelopes    []RedEnvelope `json:"envelopes"`    // 當前場上的紅包
	GameTime     int           `json:"gameTime"`     // 遊戲總時間（秒）
	TimeLeft     int           `json:"timeLeft"`     // 剩餘時間（秒）
	Status       string        `json:"status"`       // 遊戲狀態: waiting, playing, ended
	StartTime    time.Time     `json:"startTime"`    // 遊戲開始時間
	EnvelopeRate int           `json:"envelopeRate"` // 紅包生成頻率（毫秒）
}

// GameSettings represents game configuration sent to clients
type GameSettings struct {
	GameTime        int `json:"gameTime"`        // 遊戲時長（秒）
	EnvelopeCount   int `json:"envelopeCount"`   // 最大紅包數量
	EnvelopeRate    int `json:"envelopeRate"`    // 紅包生成間隔（毫秒）
	MaxEnvelopes    int `json:"maxEnvelopes"`    // 同時存在的最大紅包數
	Difficulty      int `json:"difficulty"`      // 難度等級 1-3
}

// ClientGameData represents the game data sent to clients
type ClientGameData struct {
	GameSettings GameSettings `json:"gameSettings"`
	GameTime     int          `json:"gameTime"`
	TimeLeft     int          `json:"timeLeft"`
	Status       string       `json:"status"`
}

// PlayerScore represents a player's score for ranking
type PlayerScore struct {
	Nickname      string `json:"nickname"`
	Score         int    `json:"score"`
	CollectedCount int   `json:"collectedCount"` // 收集的紅包數量
	Rank          int    `json:"rank"`
}

// EnvelopeCollectData represents data when a player collects an envelope
type EnvelopeCollectData struct {
	EnvelopeID string `json:"envelopeId"`
	Score      int    `json:"score"`
	Timestamp  int64  `json:"timestamp"`
}

// GameTimerData represents timer update data
type GameTimerData struct {
	TimeLeft int    `json:"timeLeft"`
	Status   string `json:"status"`
}