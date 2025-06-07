// 卡片記憶遊戲相關類型定義

export interface GameCard {
  positionId: number; // 卡片位置ID，用於本地翻轉效果和位置追蹤
  suit: 'heart' | 'diamond' | 'club' | 'spade'; // 花色
  value: string; // 點數: A, 2-10, J, Q, K
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