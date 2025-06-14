// 遊戲模組統一導出

// 記憶卡片遊戲
export { HostGameMonitor, CreateGame, GameStatus } from './memory-card';

// 搶紅包遊戲 - 使用別名避免衝突
export {
  RedEnvelopeGame,
  HostGameMonitor as RedEnvelopeHostGameMonitor,
  CreateRedEnvelopeGame,
  GameControl as RedEnvelopeGameControl,
  RedEnvelope,
  GameBackground as RedEnvelopeGameBackground
} from './red-envelope';

// 其他遊戲可以在這裡添加
// export * from './other-game';