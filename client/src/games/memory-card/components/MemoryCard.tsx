// 記憶卡片組件
import React from 'react';
import { Card as MuiCard, CardContent, Box } from '@mui/material';
import type { GameCard } from '../types';

interface MemoryCardProps {
  card: GameCard;
  onClick: (positionId: number, suit: string, value: string) => void;
  disabled?: boolean;
  isSelected?: boolean;
  isLocalFlipped?: boolean; // 本地翻轉狀態（用於動畫效果）
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ 
  card, 
  onClick, 
  disabled = false,
  isSelected = false,
  isLocalFlipped = false
}) => {
  const handleClick = () => {
    if (!disabled && !card.isFlipped && !card.isMatched) {
      onClick(card.positionId, card.suit, card.value);
    }
  };

  // 根據花色和點數生成圖片路徑
  const getCardImagePath = (suit: string, value: string) => {
    const valueMap: { [key: string]: string } = {
      'A': 'ace',
      'J': 'jack',
      'Q': 'queen',
      'K': 'king'
    };
    const mappedValue = valueMap[value] || value.toLowerCase();
    return `/assets/images/cards/${suit}_${mappedValue}.png`;
  };

  const cardImagePath = getCardImagePath(card.suit, card.value);
  
  // 獲取卡片顯示名稱
  const getSuitName = (suit: string) => {
    const suitNames: { [key: string]: string } = {
      'heart': '紅心',
      'diamond': '方塊',
      'club': '梅花',
      'spade': '黑桃'
    };
    return suitNames[suit] || suit;
  };

  const cardDisplayName = `${getSuitName(card.suit)}${card.value}`;
  
  // 判斷卡片是否應該顯示為翻轉狀態（服務器狀態或本地翻轉狀態）
  const shouldShowFlipped = card.isFlipped || card.isMatched || isLocalFlipped;

  return (
    <MuiCard
      sx={{
        cursor: (!disabled && !card.isFlipped && !card.isMatched && !isLocalFlipped) ? 'pointer' : 'default',
        height: '120px',
        width: '90px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: card.isMatched ? '#e8f5e9' : isSelected ? '#fff3e0' : '#fff',
        border: isSelected ? '3px solid #ff9800' : '1px solid #ddd',
        transform: shouldShowFlipped ? 'rotateY(180deg)' : 'none',
        transition: 'transform 0.6s',
        opacity: disabled ? 0.8 : 1,
        padding: '0',
        position: 'relative',
        '&:hover': {
          transform: (!disabled && !card.isFlipped && !card.isMatched && !isLocalFlipped) 
            ? 'scale(1.05)' 
            : shouldShowFlipped 
            ? 'rotateY(180deg) scale(1.05)' 
            : 'none',
        },

      }}
      onClick={handleClick}
    >
      <CardContent
        sx={{
          transform: shouldShowFlipped ? 'rotateY(180deg)' : 'none',
          transition: 'transform 0.6s',
          padding: '4px',
          '&:last-child': { paddingBottom: '4px' },
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {shouldShowFlipped ? (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={cardImagePath}
              alt={cardDisplayName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/assets/images/cards/back.svg"
              alt="牌背"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />
          </Box>
        )}
      </CardContent>
    </MuiCard>
  );
};