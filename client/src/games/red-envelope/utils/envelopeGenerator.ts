import type { RedEnvelopeItem } from '../types';

// 生成隨機紅包
export const generateEnvelopes = (count: number): RedEnvelopeItem[] => {
  const envelopes: RedEnvelopeItem[] = [];
  
  for (let i = 0; i < count; i++) {
    const envelope: RedEnvelopeItem = {
      id: `envelope-${i}-${Date.now()}-${Math.random()}`,
      x: Math.random() * (window.innerWidth - 80), // 80px是紅包寬度
      y: -50, // 從螢幕上方開始
      value: calculateRandomScore(),
      speed: Math.random() * 2 + 1, // 1-3的隨機速度
      size: getRandomSize(),
      isCollected: false,
      createdAt: Date.now()
    };
    envelopes.push(envelope);
  }
  
  return envelopes;
};

// 計算隨機分數
export const calculateScore = (): number => {
  return calculateRandomScore();
};

const calculateRandomScore = (): number => {
  const random = Math.random();
  
  // 分數分佈：
  // 70% 機率得到 1-10 分
  // 20% 機率得到 11-30 分
  // 8% 機率得到 31-50 分
  // 2% 機率得到 51-100 分
  
  if (random < 0.7) {
    return Math.floor(Math.random() * 10) + 1; // 1-10
  } else if (random < 0.9) {
    return Math.floor(Math.random() * 20) + 11; // 11-30
  } else if (random < 0.98) {
    return Math.floor(Math.random() * 20) + 31; // 31-50
  } else {
    return Math.floor(Math.random() * 50) + 51; // 51-100
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