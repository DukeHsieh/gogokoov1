// 搶紅包遊戲類型定義

export interface RedEnvelopeItem {
  id: string; // 紅包唯一ID
  x: number; // X座標位置
  y: number; // Y座標位置
  value: number; // 紅包分數值
  speed: number; // 下降速度
  size: 'small' | 'medium' | 'large'; // 紅包大小
  isCollected: boolean; // 是否已被收集
  createdAt: number; // 創建時間戳
}

export interface EnvelopePosition {
  x: number;
  y: number;
}

export interface GameState {
  status: 'waiting' | 'playing' | 'ended';
  timeLeft: number;
  envelopes: RedEnvelopeItem[];
  score: number;
  rank: number;
  totalPlayers: number;
  collectedCount: number; // 已收集的紅包數量
}

export interface GameSettings {
  duration: number; // 遊戲時間（分鐘）
  gameTime?: number; // 遊戲時間（秒）- 從服務端接收
  gameDuration?: number; // 備用欄位
  envelopeCount: number; // 紅包總數量
  envelopeRate?: number; // 紅包生成間隔（毫秒）- 從服務端接收
  maxEnvelopes?: number; // 同時存在的最大紅包數- 從服務端接收
  difficulty?: number; // 難度等級 1-3- 從服務端接收
  dropSpeed: number; // 掉落速度倍數
  title: string; // 遊戲標題
  description: string; // 遊戲說明
}

export interface GameData {
  gameSettings: GameSettings;
  envelopes: RedEnvelopeItem[];
  gameTime: number;
}

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost?: boolean;
  avatar?: string;
  collectedCount?: number; // 收集的紅包數量
}

export interface GameMessage {
  type: string;
  [key: string]: any;
}

export interface SoundEffects {
  collect: () => void; // 收集紅包音效
  miss: () => void; // 錯過紅包音效
  gameStart: () => void; // 遊戲開始音效
  gameOver: () => void; // 遊戲結束音效
  background: () => void; // 背景音樂
}