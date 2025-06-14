import type { RedEnvelopeItem } from '../utils/types';

// 生成隨機紅包 - 增強版本
export const generateEnvelopes = (count: number): RedEnvelopeItem[] => {
  const envelopes: RedEnvelopeItem[] = [];
  
  for (let i = 0; i < count; i++) {
    const envelope: RedEnvelopeItem = {
      id: `envelope-${i}-${Date.now()}-${Math.random()}`,
      x: Math.random() * (window.innerWidth - 80), // 80px是紅包寬度
      y: -80 - Math.random() * 100, // 從更高的位置開始，增加隨機性
      value: calculateRandomScore(),
      speed: Math.random() * 3 + 0.8, // 0.8-3.8的隨機速度，增加變化
      size: getRandomSize(),
      isCollected: false,
      createdAt: Date.now()
    };
    envelopes.push(envelope);
  }
  
  return envelopes;
};

// 生成單個紅包（用於連續掉落）
export const generateSingleEnvelope = (): RedEnvelopeItem => {
  return {
    id: `envelope-single-${Date.now()}-${Math.random()}`,
    x: Math.random() * (window.innerWidth - 80),
    y: -60 - Math.random() * 80, // 隨機起始高度
    value: calculateRandomScore(),
    speed: Math.random() * 2.5 + 1, // 1-3.5的速度
    size: getRandomSize(),
    isCollected: false,
    createdAt: Date.now()
  };
};

// 計算隨機分數
export const calculateScore = (): number => {
  return calculateRandomScore();
};

const calculateRandomScore = (): number => {
  const random = Math.random();
  
  // 更豐富的分數分佈：
  // 50% 機率得到 1-15 分
  // 25% 機率得到 16-35 分
  // 15% 機率得到 36-60 分
  // 8% 機率得到 61-100 分
  // 2% 機率得到 101-200 分（大獎）
  
  if (random < 0.5) {
    return Math.floor(Math.random() * 15) + 1; // 1-15
  } else if (random < 0.75) {
    return Math.floor(Math.random() * 20) + 16; // 16-35
  } else if (random < 0.9) {
    return Math.floor(Math.random() * 25) + 36; // 36-60
  } else if (random < 0.98) {
    return Math.floor(Math.random() * 40) + 61; // 61-100
  } else {
    return Math.floor(Math.random() * 100) + 101; // 101-200 大獎
  }
};

const getRandomSize = (): 'small' | 'medium' | 'large' => {
  const random = Math.random();
  if (random < 0.6) return 'small';
  if (random < 0.9) return 'medium';
  return 'large';
};

// 格式化時間顯示
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 檢查紅包是否超出螢幕
export const isEnvelopeOutOfBounds = (envelope: RedEnvelopeItem): boolean => {
  return envelope.y > window.innerHeight + 50;
};

// 檢查點擊是否命中紅包
export const isEnvelopeClicked = (
  envelope: RedEnvelopeItem,
  clickX: number,
  clickY: number
): boolean => {
  const envelopeSize = getEnvelopeSize(envelope.size);
  const halfSize = envelopeSize / 2;
  
  return (
    clickX >= envelope.x - halfSize &&
    clickX <= envelope.x + halfSize &&
    clickY >= envelope.y - halfSize &&
    clickY <= envelope.y + halfSize
  );
};

// 獲取紅包尺寸
export const getEnvelopeSize = (size: 'small' | 'medium' | 'large'): number => {
  switch (size) {
    case 'small': return 40;
    case 'medium': return 60;
    case 'large': return 80;
    default: return 60;
  }
};