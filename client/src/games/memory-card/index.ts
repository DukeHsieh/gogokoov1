// 主要遊戲頁面
export { GamePage } from './player';
export { MemoryCardGame, MemoryCard, GameStatus, CardGrid } from './player';

// 遊戲頁面組件
export { CreateGame, HostGameMonitor } from './host';


export { useGameState } from './utils/useGameState';
export { useWebSocketHandler } from './utils/useWebSocketHandler';
export { useGameTimer } from './utils/useGameTimer';

export { generateCards, formatTime } from './player/cardGenerator';
export { soundEffects } from './utils/soundEffects';

export type {
  GameCard,
  GameState,
  GameSettings,
  GameData,
  Player,
  GameMessage,
  SoundEffects
} from './utils/types';