// 卡片網格組件
import React from 'react';
import { Grid } from '@mui/material';
import { MemoryCard } from './MemoryCard';
import type { GameCard } from '../types';

interface CardGridProps {
  cards: GameCard[];
  onCardClick: (cardId: number) => void;
  disabled?: boolean;
}

export const CardGrid: React.FC<CardGridProps> = ({ 
  cards, 
  onCardClick, 
  disabled = false 
}) => {
  return (
    <Grid container spacing={2}>
      {cards.map(card => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={card.id}>
          <MemoryCard
            card={card}
            onClick={onCardClick}
            disabled={disabled}
          />
        </Grid>
      ))}
    </Grid>
  );
};