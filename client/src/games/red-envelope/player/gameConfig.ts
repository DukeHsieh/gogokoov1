import type { GameSettings } from '../utils/types/index';

// 預設遊戲設定
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  title: '搶紅包',
  description: '快速點擊掉落的紅包來獲得分數！紅包掉落速度很快，考驗你的反應力！',
  duration: 1, // 1分鐘
  gameTime: 60, // 60秒
  envelopeCount: 50, // 總共50個紅包
  dropSpeed: 1.5 // 掉落速度倍數
};

// 遊戲難度設定
export const DIFFICULTY_SETTINGS = {
  easy: {
    ...DEFAULT_GAME_SETTINGS,
    envelopeCount: 30,
    dropSpeed: 1.0,
    title: '搶紅包 - 簡單模式'
  },
  normal: {
    ...DEFAULT_GAME_SETTINGS,
    envelopeCount: 50,
    dropSpeed: 1.5,
    title: '搶紅包 - 普通模式'
  },
  hard: {
    ...DEFAULT_GAME_SETTINGS,
    envelopeCount: 80,
    dropSpeed: 2.0,
    title: '搶紅包 - 困難模式'
  }
};

// 紅包尺寸配置
export const ENVELOPE_SIZES = {
  small: {
    width: 40,
    height: 40,
    probability: 0.6 // 60%機率
  },
  medium: {
    width: 60,
    height: 60,
    probability: 0.3 // 30%機率
  },
  large: {
    width: 80,
    height: 80,
    probability: 0.1 // 10%機率
  }
};

// 分數配置
export const SCORE_CONFIG = {
  ranges: [
    { min: 1, max: 10, probability: 0.7 },   // 70% 機率得到 1-10 分
    { min: 11, max: 30, probability: 0.2 },  // 20% 機率得到 11-30 分
    { min: 31, max: 50, probability: 0.08 }, // 8% 機率得到 31-50 分
    { min: 51, max: 100, probability: 0.02 } // 2% 機率得到 51-100 分
  ]
};

// 動畫配置
export const ANIMATION_CONFIG = {
  fallSpeed: {
    min: 1,
    max: 3
  },
  spawnInterval: 500, // 每500ms生成一個新紅包
  cleanupInterval: 1000, // 每1000ms清理一次超出螢幕的紅包
  fadeOutDuration: 300 // 收集動畫持續時間
};

// UI配置
export const UI_CONFIG = {
  colors: {
    primary: '#ff4757', // 紅色主色調
    secondary: '#ffa502', // 金色輔助色
    success: '#2ed573', // 成功綠色
    background: '#f1f2f6', // 背景色
    text: '#2f3542' // 文字色
  },
  fonts: {
    title: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
    body: '"Noto Sans TC", "Microsoft JhengHei", sans-serif'
  },
  borderRadius: '12px',
  shadows: {
    card: '0 4px 12px rgba(0, 0, 0, 0.1)',
    envelope: '0 2px 8px rgba(255, 71, 87, 0.3)'
  }
};

// 響應式斷點
export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px'
};

// 遊戲狀態常數
export const GAME_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  ENDED: 'ended'
} as const;

// WebSocket 訊息類型
export const MESSAGE_TYPES = {
  GAME_START: 'gameStart',
  GAME_END: 'gameEnd',
  SCORE_UPDATE: 'redenvelope-scoreupdate',
  ENVELOPE_COLLECTED: 'envelopeCollected',
  PLAYER_RANKING: 'playerRanking'
} as const;