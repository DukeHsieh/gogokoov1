import type { SoundEffects } from '../types';

// 音效管理器
class SoundEffectsManager implements SoundEffects {
  private audioContext: AudioContext | null = null;
  private sounds: { [key: string]: AudioBuffer } = {};
  private isEnabled: boolean = true;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  // 收集紅包音效 - 清脆的鈴聲
  collect() {
    if (!this.isEnabled) return;
    
    // 播放一個上升的音調序列
    this.playTone(523, 0.1); // C5
    setTimeout(() => this.playTone(659, 0.1), 50); // E5
    setTimeout(() => this.playTone(784, 0.15), 100); // G5
  }

  // 錯過紅包音效 - 低沉的音調
  miss() {
    if (!this.isEnabled) return;
    
    this.playTone(220, 0.2, 'sawtooth'); // A3
  }

  // 遊戲開始音效 - 歡快的旋律
  gameStart() {
    if (!this.isEnabled) return;
    
    const melody = [
      { freq: 523, time: 0 },    // C5
      { freq: 659, time: 150 },  // E5
      { freq: 784, time: 300 },  // G5
      { freq: 1047, time: 450 }  // C6
    ];
    
    melody.forEach(note => {
      setTimeout(() => this.playTone(note.freq, 0.2), note.time);
    });
  }

  // 遊戲結束音效 - 結束旋律
  gameOver() {
    if (!this.isEnabled) return;
    
    const melody = [
      { freq: 784, time: 0 },    // G5
      { freq: 659, time: 200 },  // E5
      { freq: 523, time: 400 },  // C5
      { freq: 392, time: 600 }   // G4
    ];
    
    melody.forEach(note => {
      setTimeout(() => this.playTone(note.freq, 0.3), note.time);
    });
  }

  // 背景音樂 - 簡單的循環旋律
  background() {
    if (!this.isEnabled) return;
    
    // 播放輕柔的背景音調
    this.playTone(440, 0.5, 'triangle'); // A4
    setTimeout(() => this.playTone(523, 0.5, 'triangle'), 1000); // C5
  }

  // 啟用/禁用音效
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // 檢查音效是否啟用
  isAudioEnabled(): boolean {
    return this.isEnabled && this.audioContext !== null;
  }
}

// 導出單例實例
export const soundEffects = new SoundEffectsManager();