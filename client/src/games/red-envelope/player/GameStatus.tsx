import React from 'react';
import type { GameState } from '../utils/types';
import { formatTime } from './envelopeGenerator';
import { UI_CONFIG } from './gameConfig';

interface GameStatusProps {
  gameState: GameState;
  playerName?: string;
}

export const GameStatus: React.FC<GameStatusProps> = ({
  gameState,
  playerName = '玩家'
}) => {
  const { status, timeLeft, score, rank, totalPlayers, collectedCount } = gameState;

  const getStatusText = () => {
    switch (status) {
      case 'waiting':
        return '等待開始';
      case 'playing':
        return '遊戲進行中';
      case 'ended':
        return '遊戲結束';
      default:
        return '未知狀態';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'waiting':
        return '#ffa502';
      case 'playing':
        return '#2ed573';
      case 'ended':
        return '#ff4757';
      default:
        return '#747d8c';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: UI_CONFIG.borderRadius,
        padding: '12px 20px',
        boxShadow: UI_CONFIG.shadows.card,
        fontFamily: UI_CONFIG.fonts.body
      }}
    >
      {/* 左側：玩家信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${UI_CONFIG.colors.primary}, ${UI_CONFIG.colors.secondary})`,
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {playerName}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: UI_CONFIG.colors.text }}>分數:</span>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: UI_CONFIG.colors.primary
            }}
          >
            {score.toLocaleString()}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: UI_CONFIG.colors.text }}>已收集:</span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: UI_CONFIG.colors.secondary
            }}
          >
            {collectedCount}
          </span>
        </div>
      </div>

      {/* 中間：遊戲狀態 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div
          style={{
            background: getStatusColor(),
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {getStatusText()}
        </div>
        
        {status === 'playing' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: timeLeft <= 10 ? '#ff4757' : UI_CONFIG.colors.success,
              color: 'white',
              padding: '8px 16px',
              borderRadius: '25px',
              fontSize: '18px',
              fontWeight: 'bold',
              minWidth: '80px',
              justifyContent: 'center',
              animation: timeLeft <= 10 ? 'pulse 1s infinite' : 'none'
            }}
          >
            ⏰ {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* 右側：排名信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {rank > 0 && totalPlayers > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: UI_CONFIG.colors.text }}>排名:</span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: rank === 1 ? '#ffd700' : rank <= 3 ? '#c0392b' : UI_CONFIG.colors.text
              }}
            >
              {rank}/{totalPlayers}
            </span>
            {rank === 1 && (
              <span style={{ fontSize: '16px' }}>🏆</span>
            )}
            {rank === 2 && (
              <span style={{ fontSize: '16px' }}>🥈</span>
            )}
            {rank === 3 && (
              <span style={{ fontSize: '16px' }}>🥉</span>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: UI_CONFIG.colors.text }}>玩家:</span>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: UI_CONFIG.colors.text
            }}
          >
            {totalPlayers}
          </span>
        </div>
      </div>
      
      {/* CSS 動畫 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};