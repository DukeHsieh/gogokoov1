// 卡片網格組件
import React from 'react';
import { Grid } from '@mui/material';
import { MemoryCard } from './MemoryCard';
import type { GameCard } from '../utils/types';

interface CardGridProps {
  cards: GameCard[];
  onCardClick: (positionId: number, suit: string, value: string) => void;
  disabled?: boolean;
  selectedCards?: { suit: string; value: string; positionId: number }[];
  localFlippedCards?: { suit: string; value: string; positionId: number }[]; // 本地翻轉的卡片列表
}

export const CardGrid: React.FC<CardGridProps> = ({ 
  cards, 
  onCardClick, 
  disabled = false,
  selectedCards = [],
  localFlippedCards = []
}) => {

  return (
    <Grid container spacing={2}>
      {cards.map((card, index) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={`card-${card.positionId}`}>
          <MemoryCard
            card={card}
            onClick={onCardClick}
            disabled={disabled}
            isSelected={selectedCards.some(sc => sc.positionId === card.positionId)}
            isLocalFlipped={localFlippedCards.some(lfc => lfc.positionId === card.positionId)}
          />
        </Grid>
      ))}
    </Grid>
  );
};