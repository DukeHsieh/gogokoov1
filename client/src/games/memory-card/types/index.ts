// 卡片記憶遊戲相關類型定義

export interface GameCard {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export interface GameState {
  status: 'waiting' | 'playing' | 'ended';
  timeLeft: number;
  cards: GameCard[];
  score: number;
  rank: number;
  totalPlayers: number;
}

export interface GameSettings {
  numPairs: number;
  duration: number; // 遊戲時間（分鐘）
  gameDuration?: number; // 備用欄位
}

export interface GameData {
  gameSettings: GameSettings;
  cards: GameCard[];
  gameTime: number;
}

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost?: boolean;
}

export interface GameMessage {
  type: string;
  [key: string]: any;
}

export interface SoundEffects {
  flip: () => void;
  match: () => void;
  mismatch: () => void;
  gameOver: () => void;
}