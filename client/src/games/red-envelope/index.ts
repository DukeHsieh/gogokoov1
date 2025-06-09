// 搶紅包遊戲模組導出

// 主要組件 - 使用命名空間避免衝突
export { RedEnvelopeGame } from './components/RedEnvelopeGame';
export { default as RedEnvelopeHostGameMonitor } from './components/HostGameMonitor';
export { GameStatus as RedEnvelopeGameStatus } from './components/GameStatus';
export { RedEnvelope } from './components/RedEnvelope';
export { GameBackground as RedEnvelopeGameBackground } from './components/GameBackground';
export { default as CreateRedEnvelopeGame } from './CreateRedEnvelopeGame';

// Hooks - 使用命名空間避免衝突
export { useGameState as useRedEnvelopeGameState } from './hooks/useGameState';
export { useGameAnimation as useRedEnvelopeGameAnimation } from './hooks/useGameAnimation';

// 工具函數 - 重新導出特定函數避免衝突
export { 
  generateEnvelopes, 
  calculateScore, 
  formatTime as redEnvelopeFormatTime,
  isEnvelopeOutOfBounds,
  isEnvelopeClicked,
  getEnvelopeSize 
} from './utils/envelopeGenerator';
// 暫時註解掉找不到的音效模組導出
// export { soundEffects as redEnvelopeSoundEffects } from './utils/soundEffects';

// 類型定義 - 使用命名空間
export type {
  RedEnvelopeItem,
  EnvelopePosition,
  GameState as RedEnvelopeGameState,
  GameSettings as RedEnvelopeGameSettings,
  GameData as RedEnvelopeGameData,
  Player as RedEnvelopePlayer,
  GameMessage as RedEnvelopeGameMessage,
  SoundEffects as RedEnvelopeSoundEffects
} from './types';

// 配置
export {
  DEFAULT_GAME_SETTINGS as RED_ENVELOPE_DEFAULT_SETTINGS,
  DIFFICULTY_SETTINGS as RED_ENVELOPE_DIFFICULTY_SETTINGS,
  ENVELOPE_SIZES,
  SCORE_CONFIG as RED_ENVELOPE_SCORE_CONFIG,
  ANIMATION_CONFIG as RED_ENVELOPE_ANIMATION_CONFIG,
  UI_CONFIG as RED_ENVELOPE_UI_CONFIG,
  BREAKPOINTS as RED_ENVELOPE_BREAKPOINTS,
  GAME_STATUS as RED_ENVELOPE_GAME_STATUS,
  MESSAGE_TYPES as RED_ENVELOPE_MESSAGE_TYPES
} from './config/gameConfig';