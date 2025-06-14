// 搶紅包遊戲模組導出

// 主要組件 - 使用命名空間避免衝突
export { RedEnvelopeGame } from './player/RedEnvelopeGame';
export { default as HostGameMonitor } from './host/HostGameMonitor';
export { GameStatus } from './player/GameStatus';
export { RedEnvelope } from './player/RedEnvelope';
export { GameBackground } from './player/GameBackground';
export { default as CreateRedEnvelopeGame } from './host/CreateRedEnvelopeGame';
export { default as GameControl } from './player/GameControl';

// Hooks - 使用命名空間避免衝突
export { useGameState as useRedEnvelopeGameState } from './utils/hooks/useGameState';
export { useGameAnimation as useRedEnvelopeGameAnimation } from './utils/hooks/useGameAnimation';

// 工具函數 - 重新導出特定函數避免衝突
export { 
  generateEnvelopes, 
  calculateScore, 
  formatTime as redEnvelopeFormatTime,
  isEnvelopeOutOfBounds,
  isEnvelopeClicked,
  getEnvelopeSize 
} from './player/envelopeGenerator';
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
} from './utils/types';

// 配置
export {
  DEFAULT_GAME_SETTINGS as RED_ENVELOPE_DEFAULT_GAME_SETTINGS,
  DIFFICULTY_SETTINGS as RED_ENVELOPE_DIFFICULTY_SETTINGS,
  ENVELOPE_SIZES as RED_ENVELOPE_SIZES,
  ANIMATION_CONFIG as RED_ENVELOPE_ANIMATION_CONFIG,
  UI_CONFIG as RED_ENVELOPE_UI_CONFIG,
  BREAKPOINTS as RED_ENVELOPE_BREAKPOINTS,
  GAME_STATUS as RED_ENVELOPE_GAME_STATUS,
  MESSAGE_TYPES as RED_ENVELOPE_MESSAGE_TYPES
} from './player/gameConfig';