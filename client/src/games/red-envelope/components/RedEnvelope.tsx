import React from 'react';
import type { RedEnvelopeItem } from '../types';
import { getEnvelopeSize } from '../utils/envelopeGenerator';
import { UI_CONFIG } from '../config/gameConfig';

interface RedEnvelopeProps {
  envelope: RedEnvelopeItem;
  onClick: (envelopeId: string) => void;
  isCollected?: boolean;
}

export const RedEnvelope: React.FC<RedEnvelopeProps> = ({
  envelope,
  onClick,
  isCollected = false
}) => {
  const size = getEnvelopeSize(envelope.size);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isCollected && !envelope.isCollected) {
      onClick(envelope.id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isCollected && !envelope.isCollected) {
      onClick(envelope.id);
    }
  };

  const getEnvelopeColor = () => {
    switch (envelope.size) {
      case 'small': return '#ff6b6b';
      case 'medium': return '#ff4757';
      case 'large': return '#ff3742';
      default: return '#ff4757';
    }
  };

  const getGoldAccent = () => {
    switch (envelope.size) {
      case 'small': return '#ffd700';
      case 'medium': return '#ffed4e';
      case 'large': return '#fff200';
      default: return '#ffd700';
    }
  };

  if (envelope.isCollected || isCollected) {
    return null; // 已收集的紅包不顯示
  }

  return (
    <div
      className="red-envelope"
      style={{
        position: 'absolute',
        left: envelope.x - size / 2,
        top: envelope.y - size / 2,
        width: size,
        height: size,
        cursor: 'pointer',
        zIndex: 10,
        transform: 'translateZ(0)', // 硬體加速
        transition: 'none' // 禁用過渡動畫以提高性能
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart} // 支援觸控
    >
      {/* 紅包主體 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${getEnvelopeColor()}, ${getEnvelopeColor()}dd)`,
          borderRadius: '8px',
          border: `2px solid ${getGoldAccent()}`,
          boxShadow: UI_CONFIG.shadows.envelope,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* 金色裝飾線 */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            right: '10%',
            height: '2px',
            background: getGoldAccent(),
            borderRadius: '1px'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '10%',
            right: '10%',
            height: '2px',
            background: getGoldAccent(),
            borderRadius: '1px'
          }}
        />
        
        {/* 中央圖案 */}
        <div
          style={{
            width: '60%',
            height: '60%',
            background: getGoldAccent(),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.3,
            fontWeight: 'bold',
            color: getEnvelopeColor(),
            fontFamily: UI_CONFIG.fonts.title
          }}
        >
          福
        </div>
        
        {/* 分數顯示 */}
        {envelope.size === 'large' && (
          <div
            style={{
              position: 'absolute',
              bottom: '5px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '8px',
              color: getGoldAccent(),
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {envelope.value}
          </div>
        )}
        
        {/* 閃光效果 */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            right: '15%',
            width: '8px',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            animation: 'sparkle 2s infinite'
          }}
        />
      </div>
      
      {/* CSS 動畫樣式 */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};