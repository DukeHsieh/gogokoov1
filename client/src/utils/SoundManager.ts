// 音效管理器
class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;

  private constructor() {
    this.initializeAudioContext();
    this.preloadSounds();
    this.initializeBackgroundMusic();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('音效初始化失敗:', error);
    }
  }

  private preloadSounds() {
    const soundFiles = {
      // 監控頁面音效
      playerJoin: '/assets/sounds/notification.mp3',
      playerLeave: '/assets/sounds/notification.mp3',
      gameStart: '/assets/sounds/notification.mp3',
      gameEnd: '/assets/sounds/notification.mp3',
      scoreUpdate: '/assets/sounds/notification.mp3',
      timeWarning: '/assets/sounds/notification.mp3',
      
      // 遊戲頁面音效（備用）
      cardFlip: '/assets/sounds/notification.mp3',
      match: '/assets/sounds/notification.mp3',
      mismatch: '/assets/sounds/notification.mp3'
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = 0.5;
      this.sounds.set(key, audio);
    });
  }

  private initializeBackgroundMusic() {
    // 優先選擇派對風格背景音樂（包含重低音電子音樂和電子舞曲節奏音樂）
    const partyMusicOptions = [
      '/assets/sounds/party-196690.mp3',

    ];
    
    const fallbackMusicOptions = [
      '/assets/sounds/dramatic-epic-background.mp3',
      '/assets/sounds/intense-background-music.mp3'
    ];
    
    // 隨機選擇派對音樂作為主要背景音樂
    const randomIndex = Math.floor(Math.random() * partyMusicOptions.length);
    const primaryMusic = partyMusicOptions[randomIndex];
    
    // 其他派對音樂和備用音樂作為fallback
    const otherPartyMusic = partyMusicOptions.filter((_, index) => index !== randomIndex);
    const fallbackOptions = [...otherPartyMusic, ...fallbackMusicOptions];
    
    this.loadBackgroundMusic(primaryMusic, fallbackOptions);
  }

  private loadBackgroundMusic(primaryPath: string, fallbackPaths?: string[]) {
    this.backgroundMusic = new Audio(primaryPath);
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.3;
    this.backgroundMusic.preload = 'auto';
    
    this.backgroundMusic.addEventListener('error', (e) => {
      console.warn(`Background music failed to load from ${primaryPath}:`, e);
      if (fallbackPaths && fallbackPaths.length > 0) {
        const nextPath = fallbackPaths[0];
        const remainingPaths = fallbackPaths.slice(1);
        console.log(`Trying fallback music: ${nextPath}`);
        this.loadBackgroundMusic(nextPath, remainingPaths);
      } else {
        console.error('All background music sources failed to load');
      }
    });
    
    this.backgroundMusic.addEventListener('canplaythrough', () => {
      console.log(`Background music loaded successfully: ${primaryPath}`);
    });
  }

  // 播放音效
  public playSound(soundName: string, volume: number = 0.5): void {
    if (this.isMuted) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      try {
        sound.volume = Math.max(0, Math.min(1, volume));
        sound.currentTime = 0;
        sound.play().catch(error => {
          console.warn(`播放音效 ${soundName} 失敗:`, error);
        });
      } catch (error) {
        console.warn(`播放音效 ${soundName} 失敗:`, error);
      }
    } else {
      // 如果沒有預載的音效，使用Web Audio API生成簡單音效
      this.playGeneratedSound(soundName);
    }
  }

  // 使用Web Audio API生成音效
  private playGeneratedSound(soundName: string): void {
    if (!this.audioContext || this.isMuted) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // 根據音效類型設置不同的頻率和持續時間
      const soundConfig = this.getSoundConfig(soundName);
      
      oscillator.frequency.setValueAtTime(soundConfig.frequency, this.audioContext.currentTime);
      oscillator.type = soundConfig.type;
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + soundConfig.duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + soundConfig.duration);
    } catch (error) {
      console.warn('生成音效失敗:', error);
    }
  }

  private getSoundConfig(soundName: string): { frequency: number; duration: number; type: OscillatorType } {
    const configs: Record<string, { frequency: number; duration: number; type: OscillatorType }> = {
      playerJoin: { frequency: 800, duration: 0.2, type: 'sine' },
      playerLeave: { frequency: 400, duration: 0.3, type: 'sine' },
      gameStart: { frequency: 1000, duration: 0.5, type: 'triangle' },
      gameEnd: { frequency: 600, duration: 1.0, type: 'sine' },
      scoreUpdate: { frequency: 1200, duration: 0.1, type: 'square' },
      timeWarning: { frequency: 300, duration: 0.5, type: 'sawtooth' },
      cardFlip: { frequency: 800, duration: 0.1, type: 'sine' },
      match: { frequency: 1000, duration: 0.3, type: 'triangle' },
      mismatch: { frequency: 200, duration: 0.5, type: 'square' }
    };

    return configs[soundName] || { frequency: 440, duration: 0.2, type: 'sine' };
  }

  // 播放複合音效（多個音符組成的旋律）
  public playMelody(notes: { frequency: number; duration: number; delay: number }[]): void {
    if (this.isMuted || !this.audioContext) return;

    notes.forEach(note => {
      setTimeout(() => {
        try {
          const oscillator = this.audioContext!.createOscillator();
          const gainNode = this.audioContext!.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext!.destination);
          
          oscillator.frequency.setValueAtTime(note.frequency, this.audioContext!.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.2, this.audioContext!.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + note.duration);
          
          oscillator.start(this.audioContext!.currentTime);
          oscillator.stop(this.audioContext!.currentTime + note.duration);
        } catch (error) {
          console.warn('播放旋律失敗:', error);
        }
      }, note.delay);
    });
  }

  // 靜音控制
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  // 設置全局音量
  public setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = normalizedVolume;
    });
  }

  // 背景音樂控制
  public playBackgroundMusic(customPath?: string): void {
    if (customPath) {
      // 如果提供了自定義路徑，載入新的背景音樂
      this.loadCustomBackgroundMusic(customPath);
    } else if (this.backgroundMusic && !this.isMusicMuted) {
      this.backgroundMusic.play().catch(error => {
        console.warn('播放背景音樂失敗:', error);
      });
    }
  }

  private loadCustomBackgroundMusic(path: string): void {
    // 停止當前背景音樂
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
    
    // 載入新的背景音樂
    this.backgroundMusic = new Audio(path);
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.3;
    this.backgroundMusic.preload = 'auto';
    
    this.backgroundMusic.addEventListener('error', (e) => {
      console.warn(`Custom background music failed to load from ${path}:`, e);
    });
    
    this.backgroundMusic.addEventListener('canplaythrough', () => {
      console.log(`Custom background music loaded successfully: ${path}`);
      if (!this.isMusicMuted) {
        this.backgroundMusic!.play().catch(error => {
          console.warn('播放自定義背景音樂失敗:', error);
        });
      }
    });
  }

  public pauseBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  public stopBackgroundMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  public setBackgroundMusicVolume(volume: number): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = Math.max(0, Math.min(1, volume));
    }
  }

  public setMusicMuted(muted: boolean): void {
    this.isMusicMuted = muted;
    if (muted) {
      this.pauseBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
  }

  public isMusicSoundMuted(): boolean {
    return this.isMusicMuted;
  }

  public isBackgroundMusicPlaying(): boolean {
    return this.backgroundMusic ? !this.backgroundMusic.paused : false;
  }
}

export default SoundManager;