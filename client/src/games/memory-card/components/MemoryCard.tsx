// 記憶卡片組件
import React from 'react';
import { Card as MuiCard, CardContent, Box } from '@mui/material';
import type { GameCard } from '../types';

interface MemoryCardProps {
  card: GameCard;
  onClick: (cardId: number) => void;
  disabled?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ 
  card, 
  onClick, 
  disabled = false 
}) => {
  const handleClick = () => {
    if (!disabled && !card.isFlipped && !card.isMatched) {
      onClick(card.id);
    }
  };

  return (
    <MuiCard
      sx={{
        cursor: (!disabled && !card.isFlipped && !card.isMatched) ? 'pointer' : 'default',
        height: '120px',
        width: '90px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: card.isMatched ? '#e8f5e9' : '#fff',
        transform: card.isFlipped ? 'rotateY(180deg)' : 'none',
        transition: 'transform 0.6s',
        opacity: disabled ? 0.8 : 1,
        padding: '0',
        '&:hover': {
          transform: (!disabled && !card.isFlipped && !card.isMatched) 
            ? 'scale(1.05)' 
            : card.isFlipped 
            ? 'rotateY(180deg) scale(1.05)' 
            : 'none',
        },
      }}
      onClick={handleClick}
    >
      <CardContent
        sx={{
          transform: card.isFlipped ? 'rotateY(180deg)' : 'none',
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
        {card.isFlipped || card.isMatched ? (
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
              src={card.value}
              alt="撲克牌"
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
              src="/assets/images/cards/back.png"
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