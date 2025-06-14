import React from 'react';
import type { RedEnvelopeItem } from '../utils/types';
import { getEnvelopeSize } from './envelopeGenerator';

interface AnimalRedEnvelopeProps {
  envelope: RedEnvelopeItem;
  onClick: (envelopeId: string) => void;
  isCollected?: boolean;
}

// 动物图案数组
const ANIMAL_PATTERNS = [
  'cat', 'dog', 'rabbit', 'panda', 'fox', 'bear', 'tiger', 'lion'
];

// 根据红包ID获取动物图案
const getAnimalPattern = (envelopeId: string): string => {
  const hash = envelopeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ANIMAL_PATTERNS[hash % ANIMAL_PATTERNS.length];
};

// 动物SVG组件
const AnimalSVG: React.FC<{ animal: string; size: number; color: string }> = ({ animal, size, color }) => {
  const svgSize = size * 0.6;
  
  const renderAnimal = () => {
    switch (animal) {
      case 'cat':
        return (
          <g>
            {/* 猫头 */}
            <circle cx={svgSize/2} cy={svgSize/2} r={svgSize/3} fill={color} />
            {/* 猫耳朵 */}
            <polygon points={`${svgSize/2-svgSize/4},${svgSize/2-svgSize/3} ${svgSize/2-svgSize/6},${svgSize/2-svgSize/2} ${svgSize/2-svgSize/8},${svgSize/2-svgSize/3}`} fill={color} />
            <polygon points={`${svgSize/2+svgSize/4},${svgSize/2-svgSize/3} ${svgSize/2+svgSize/6},${svgSize/2-svgSize/2} ${svgSize/2+svgSize/8},${svgSize/2-svgSize/3}`} fill={color} />
            {/* 猫眼睛 */}
            <circle cx={svgSize/2-svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            <circle cx={svgSize/2+svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            {/* 猫鼻子 */}
            <polygon points={`${svgSize/2},${svgSize/2} ${svgSize/2-svgSize/20},${svgSize/2+svgSize/20} ${svgSize/2+svgSize/20},${svgSize/2+svgSize/20}`} fill="#ff69b4" />
          </g>
        );
      
      case 'dog':
        return (
          <g>
            {/* 狗头 */}
            <ellipse cx={svgSize/2} cy={svgSize/2} rx={svgSize/3} ry={svgSize/3.5} fill={color} />
            {/* 狗耳朵 */}
            <ellipse cx={svgSize/2-svgSize/4} cy={svgSize/2-svgSize/6} rx={svgSize/8} ry={svgSize/4} fill={color} />
            <ellipse cx={svgSize/2+svgSize/4} cy={svgSize/2-svgSize/6} rx={svgSize/8} ry={svgSize/4} fill={color} />
            {/* 狗眼睛 */}
            <circle cx={svgSize/2-svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            <circle cx={svgSize/2+svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            {/* 狗鼻子 */}
            <circle cx={svgSize/2} cy={svgSize/2+svgSize/20} r={svgSize/25} fill="#000" />
          </g>
        );
      
      case 'rabbit':
        return (
          <g>
            {/* 兔子头 */}
            <circle cx={svgSize/2} cy={svgSize/2+svgSize/12} r={svgSize/3.5} fill={color} />
            {/* 兔子耳朵 */}
            <ellipse cx={svgSize/2-svgSize/6} cy={svgSize/2-svgSize/3} rx={svgSize/12} ry={svgSize/3} fill={color} />
            <ellipse cx={svgSize/2+svgSize/6} cy={svgSize/2-svgSize/3} rx={svgSize/12} ry={svgSize/3} fill={color} />
            {/* 兔子眼睛 */}
            <circle cx={svgSize/2-svgSize/10} cy={svgSize/2} r={svgSize/20} fill="#000" />
            <circle cx={svgSize/2+svgSize/10} cy={svgSize/2} r={svgSize/20} fill="#000" />
            {/* 兔子鼻子 */}
            <ellipse cx={svgSize/2} cy={svgSize/2+svgSize/15} rx={svgSize/30} ry={svgSize/40} fill="#ff69b4" />
          </g>
        );
      
      case 'panda':
        return (
          <g>
            {/* 熊猫头 */}
            <circle cx={svgSize/2} cy={svgSize/2} r={svgSize/3} fill="#fff" />
            {/* 熊猫耳朵 */}
            <circle cx={svgSize/2-svgSize/4} cy={svgSize/2-svgSize/4} r={svgSize/8} fill="#000" />
            <circle cx={svgSize/2+svgSize/4} cy={svgSize/2-svgSize/4} r={svgSize/8} fill="#000" />
            {/* 熊猫眼圈 */}
            <ellipse cx={svgSize/2-svgSize/8} cy={svgSize/2-svgSize/12} rx={svgSize/12} ry={svgSize/8} fill="#000" />
            <ellipse cx={svgSize/2+svgSize/8} cy={svgSize/2-svgSize/12} rx={svgSize/12} ry={svgSize/8} fill="#000" />
            {/* 熊猫眼睛 */}
            <circle cx={svgSize/2-svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/25} fill="#fff" />
            <circle cx={svgSize/2+svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/25} fill="#fff" />
            {/* 熊猫鼻子 */}
            <circle cx={svgSize/2} cy={svgSize/2+svgSize/20} r={svgSize/30} fill="#000" />
          </g>
        );
      
      case 'fox':
        return (
          <g>
            {/* 狐狸头 */}
            <polygon points={`${svgSize/2},${svgSize/2-svgSize/4} ${svgSize/2-svgSize/3},${svgSize/2+svgSize/4} ${svgSize/2+svgSize/3},${svgSize/2+svgSize/4}`} fill={color} />
            {/* 狐狸耳朵 */}
            <polygon points={`${svgSize/2-svgSize/6},${svgSize/2-svgSize/4} ${svgSize/2-svgSize/3},${svgSize/2-svgSize/2} ${svgSize/2-svgSize/8},${svgSize/2-svgSize/6}`} fill={color} />
            <polygon points={`${svgSize/2+svgSize/6},${svgSize/2-svgSize/4} ${svgSize/2+svgSize/3},${svgSize/2-svgSize/2} ${svgSize/2+svgSize/8},${svgSize/2-svgSize/6}`} fill={color} />
            {/* 狐狸眼睛 */}
            <circle cx={svgSize/2-svgSize/10} cy={svgSize/2-svgSize/20} r={svgSize/25} fill="#000" />
            <circle cx={svgSize/2+svgSize/10} cy={svgSize/2-svgSize/20} r={svgSize/25} fill="#000" />
            {/* 狐狸鼻子 */}
            <circle cx={svgSize/2} cy={svgSize/2+svgSize/30} r={svgSize/35} fill="#000" />
          </g>
        );
      
      case 'bear':
        return (
          <g>
            {/* 熊头 */}
            <circle cx={svgSize/2} cy={svgSize/2} r={svgSize/3} fill={color} />
            {/* 熊耳朵 */}
            <circle cx={svgSize/2-svgSize/4} cy={svgSize/2-svgSize/4} r={svgSize/8} fill={color} />
            <circle cx={svgSize/2+svgSize/4} cy={svgSize/2-svgSize/4} r={svgSize/8} fill={color} />
            {/* 熊眼睛 */}
            <circle cx={svgSize/2-svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            <circle cx={svgSize/2+svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            {/* 熊鼻子 */}
            <ellipse cx={svgSize/2} cy={svgSize/2+svgSize/20} rx={svgSize/20} ry={svgSize/30} fill="#000" />
          </g>
        );
      
      case 'tiger':
        return (
          <g>
            {/* 老虎头 */}
            <circle cx={svgSize/2} cy={svgSize/2} r={svgSize/3} fill={color} />
            {/* 老虎条纹 */}
            <rect x={svgSize/2-svgSize/6} y={svgSize/2-svgSize/4} width={svgSize/20} height={svgSize/6} fill="#000" />
            <rect x={svgSize/2+svgSize/8} y={svgSize/2-svgSize/4} width={svgSize/20} height={svgSize/6} fill="#000" />
            {/* 老虎耳朵 */}
            <polygon points={`${svgSize/2-svgSize/4},${svgSize/2-svgSize/3} ${svgSize/2-svgSize/6},${svgSize/2-svgSize/2} ${svgSize/2-svgSize/8},${svgSize/2-svgSize/3}`} fill={color} />
            <polygon points={`${svgSize/2+svgSize/4},${svgSize/2-svgSize/3} ${svgSize/2+svgSize/6},${svgSize/2-svgSize/2} ${svgSize/2+svgSize/8},${svgSize/2-svgSize/3}`} fill={color} />
            {/* 老虎眼睛 */}
            <circle cx={svgSize/2-svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            <circle cx={svgSize/2+svgSize/8} cy={svgSize/2-svgSize/12} r={svgSize/20} fill="#000" />
            {/* 老虎鼻子 */}
            <polygon points={`${svgSize/2},${svgSize/2} ${svgSize/2-svgSize/25},${svgSize/2+svgSize/25} ${svgSize/2+svgSize/25},${svgSize/2+svgSize/25}`} fill="#000" />
          </g>
        );
      
      case 'lion':
        return (
          <g>
            {/* 狮子头 */}
            <circle cx={svgSize/2} cy={svgSize/2} r={svgSize/4} fill={color} />
            {/* 狮子鬃毛 */}
            <circle cx={svgSize/2} cy={svgSize/2} r={svgSize/3} fill={color} opacity="0.7" />
            {/* 狮子眼睛 */}
            <circle cx={svgSize/2-svgSize/10} cy={svgSize/2-svgSize/15} r={svgSize/25} fill="#000" />
            <circle cx={svgSize/2+svgSize/10} cy={svgSize/2-svgSize/15} r={svgSize/25} fill="#000" />
            {/* 狮子鼻子 */}
            <polygon points={`${svgSize/2},${svgSize/2} ${svgSize/2-svgSize/25},${svgSize/2+svgSize/20} ${svgSize/2+svgSize/25},${svgSize/2+svgSize/20}`} fill="#000" />
          </g>
        );
      
      default:
        return (
          <circle cx={svgSize/2} cy={svgSize/2} r={svgSize/3} fill={color} />
        );
    }
  };

  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
      {renderAnimal()}
    </svg>
  );
};

export const AnimalRedEnvelope: React.FC<AnimalRedEnvelopeProps> = ({
  envelope,
  onClick,
  isCollected = false
}) => {
  const size = getEnvelopeSize(envelope.size);
  const animal = getAnimalPattern(envelope.id);
  
  // 根据红包价值确定颜色和特效
  const getEnvelopeStyle = (value: number) => {
    if (value >= 100) {
      return {
        color: '#ff1744', // 大獎紅包 - 深紅色
        glow: true,
        sparkle: true
      };
    }
    if (value >= 60) {
      return {
        color: '#ff6b6b', // 高價值紅包 - 紅色
        glow: true,
        sparkle: false
      };
    }
    if (value >= 30) {
      return {
        color: '#ffa726', // 中價值紅包 - 橙色
        glow: false,
        sparkle: false
      };
    }
    return {
      color: '#ff8a80', // 低價值紅包 - 淺紅色
      glow: false,
      sparkle: false
    };
  };
  
  const envelopeStyle = getEnvelopeStyle(envelope.value);
  
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
    return envelopeStyle.color;
  };

  const getAnimalColor = () => {
    switch (animal) {
      case 'cat': return '#ffa502';
      case 'dog': return '#8b4513';
      case 'rabbit': return '#fff';
      case 'panda': return '#000';
      case 'fox': return '#ff6348';
      case 'bear': return '#8b4513';
      case 'tiger': return '#ffa500';
      case 'lion': return '#daa520';
      default: return '#ffd700';
    }
  };

  if (envelope.isCollected || isCollected) {
    return null;
  }

  return (
    <div
      className="animal-red-envelope"
      style={{
        position: 'absolute',
        left: envelope.x - size / 2,
        top: envelope.y - size / 2,
        width: size,
        height: size,
        cursor: 'pointer',
        zIndex: 10,
        transform: 'translateZ(0)',
        transition: 'none',
        animation: 'float 3s ease-in-out infinite'
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {/* 红包背景 */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${getEnvelopeColor()}, ${getEnvelopeColor()}dd)`,
          borderRadius: '12px',
          border: envelopeStyle.glow ? '3px solid #ffd700' : '2px solid #ffd700',
          boxShadow: envelopeStyle.glow 
            ? '0 4px 12px rgba(255, 71, 87, 0.6), 0 0 30px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 23, 68, 0.4)'
            : '0 4px 12px rgba(255, 71, 87, 0.4), 0 0 20px rgba(255, 215, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: envelopeStyle.glow ? 'glow 2s ease-in-out infinite alternate' : 'none'
        }}
      >
        {/* 动物图案 */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <AnimalSVG animal={animal} size={size} color={getAnimalColor()} />
        </div>
        
        {/* 装饰性光效 */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            right: '15%',
            width: envelopeStyle.sparkle ? '16px' : '12px',
            height: envelopeStyle.sparkle ? '16px' : '12px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 70%, transparent 100%)',
            borderRadius: '50%',
            animation: envelopeStyle.sparkle ? 'sparkle-intense 1.5s infinite' : 'sparkle 2s infinite'
          }}
        />
        
        {/* 大獎紅包額外閃爍效果 */}
        {envelopeStyle.sparkle && (
          <>
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '20%',
                width: '8px',
                height: '8px',
                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'sparkle-delay 2s infinite 0.5s'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '25%',
                right: '25%',
                width: '6px',
                height: '6px',
                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'sparkle-delay 2s infinite 1s'
              }}
            />
          </>
        )}
        
        {/* 分数显示 */}
        {envelope.size === 'large' && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: '#ffd700',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              background: 'rgba(0,0,0,0.3)',
              padding: '2px 6px',
              borderRadius: '8px'
            }}
          >
            {envelope.value}
          </div>
        )}
      </div>
      
      {/* CSS 动画样式 */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        
        @keyframes sparkle-intense {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          25% { opacity: 1; transform: scale(1.5); }
          50% { opacity: 0.8; transform: scale(1.2); }
          75% { opacity: 1; transform: scale(1.4); }
        }
        
        @keyframes sparkle-delay {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 4px 12px rgba(255, 71, 87, 0.6), 0 0 30px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 23, 68, 0.4); }
          100% { box-shadow: 0 4px 12px rgba(255, 71, 87, 0.8), 0 0 40px rgba(255, 215, 0, 1), 0 0 70px rgba(255, 23, 68, 0.6); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-3px) rotate(1deg); }
          66% { transform: translateY(3px) rotate(-1deg); }
        }
        
        .animal-red-envelope:hover {
          transform: scale(1.1) !important;
          transition: transform 0.2s ease !important;
        }
      `}</style>
    </div>
  );
};