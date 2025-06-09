// 卡片記憶遊戲音效管理
import type { SoundEffects } from './types';

// 音效播放函數
const playSound = (frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.log('音效播放失敗:', error);
  }
};

// 不同類型的音效
export const soundEffects: SoundEffects = {
  flip: () => playSound(800, 0.1), // 翻牌音效
  match: () => {
    // 配對成功音效 - 上升音調
    playSound(523, 0.15); // C5
    setTimeout(() => playSound(659, 0.15), 100); // E5
    setTimeout(() => playSound(784, 0.2), 200); // G5
  },
  mismatch: () => {
    // 配對失敗音效 - 下降音調
    playSound(400, 0.3, 'square');
  },
  gameOver: () => {
    // 遊戲結束音效 - 勝利旋律
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((note, index) => {
      setTimeout(() => playSound(note, 0.3), index * 150);
    });
  }
};