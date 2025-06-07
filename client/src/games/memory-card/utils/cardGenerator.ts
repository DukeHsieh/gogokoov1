// 卡片記憶遊戲卡片生成工具
import type { GameCard } from '../types';

/**
 * 生成記憶卡片
 * @param count 卡片總數
 * @returns 生成的卡片陣列
 */
export const generateCards = (count: number): GameCard[] => {
  // 定義撲克牌花色和數值
  const suits = ['spade', 'heart', 'diamond', 'club'] as const;
  const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'] as const;
  
  // 生成所有可能的撲克牌組合
  const allCards: { suit: typeof suits[number]; value: typeof values[number] }[] = [];
  for (const suit of suits) {
    for (const value of values) {
      allCards.push({ suit, value });
    }
  }
  
  // 打亂所有卡牌
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }
  
  // 計算需要多少對卡牌
  const pairsNeeded = Math.ceil(count / 2);
  // 從打亂的卡牌中選擇所需數量的卡牌
  const selectedUniqueCards = allCards.slice(0, pairsNeeded);
  
  // 為每張卡牌創建一對
  const cardPairs: { suit: typeof suits[number]; value: typeof values[number] }[] = [];
  for (const card of selectedUniqueCards) {
    cardPairs.push(card);
    cardPairs.push(card); // 每張牌有兩張用於配對
  }
  
  // 如果需要奇數張卡牌，移除最後一張
  if (count % 2 !== 0 && cardPairs.length > count) {
    cardPairs.pop();
  }
  
  // 再次打亂卡牌
  const selectedCards = cardPairs.slice(0, count);
  for (let i = selectedCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedCards[i], selectedCards[j]] = [selectedCards[j], selectedCards[i]];
  }

  return selectedCards.map((card, index) => ({
    positionId: index,
    suit: card.suit,
    value: card.value,
    isFlipped: false,
    isMatched: false,
  }));
};

/**
 * 格式化時間顯示
 * @param seconds 秒數
 * @returns 格式化的時間字串 (mm:ss)
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};