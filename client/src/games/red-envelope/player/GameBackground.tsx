import React from 'react';
import { UI_CONFIG } from './gameConfig';

interface GameBackgroundProps {
  isPlaying?: boolean;
  children?: React.ReactNode;
}

export const GameBackground: React.FC<GameBackgroundProps> = ({
  isPlaying = false,
  children
}) => {
  return (
    <div
      className="game-background"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(135deg, 
          #ff9a9e 0%, 
          #fecfef 25%, 
          #fecfef 50%, 
          #ff9a9e 75%, 
          #ff6b9d 100%
        )`,
        fontFamily: UI_CONFIG.fonts.body
      }}
    >
      {/* 雲朵裝飾 */}
      <div className="clouds">
        {[...Array(6)].map((_, index) => {
          const cloudStyles = [
            { width: 100, height: 40, top: '20%', left: -100 },
            { width: 80, height: 30, top: '15%', left: -80 },
            { width: 120, height: 50, top: '25%', left: -120 },
            { width: 90, height: 35, top: '10%', left: -90 },
            { width: 110, height: 45, top: '30%', left: -110 },
            { width: 70, height: 25, top: '18%', left: -70 }
          ];
          const cloudStyle = cloudStyles[index];
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '50px',
                opacity: 0.6,
                animation: `float-${index % 3 + 1} ${15 + index * 2}s infinite linear`,
                width: cloudStyle.width,
                height: cloudStyle.height,
                top: cloudStyle.top,
                left: cloudStyle.left,
                zIndex: 1
              }}
            />
          );
        })}
      </div>

      {/* 櫻花飄落效果 */}
      {isPlaying && (
        <div className="sakura-container">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                fontSize: window.innerWidth <= 768 ? '16px' : '20px',
                animation: `sakura-fall ${8 + Math.random() * 4}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
                zIndex: 5
              }}
            >
              🌸
            </div>
          ))}
        </div>
      )}

      {/* 山丘背景 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: window.innerWidth <= 768 ? '120px' : '200px',
          zIndex: 2
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            borderRadius: '50% 50% 0 0',
            left: '-50px',
            width: window.innerWidth <= 768 ? '200px' : '300px',
            height: window.innerWidth <= 768 ? '100px' : '150px',
            background: 'rgba(76, 175, 80, 0.3)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            borderRadius: '50% 50% 0 0',
            right: '-50px',
            width: window.innerWidth <= 768 ? '180px' : '250px',
            height: window.innerWidth <= 768 ? '80px' : '120px',
            background: 'rgba(139, 195, 74, 0.3)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            borderRadius: '50% 50% 0 0',
            left: '50%',
            transform: 'translateX(-50%)',
            width: window.innerWidth <= 768 ? '250px' : '400px',
            height: window.innerWidth <= 768 ? '60px' : '100px',
            background: 'rgba(156, 204, 101, 0.2)'
          }}
        />
      </div>

      {/* 主要內容區域 */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          height: '100%'
        }}
      >
        {children}
      </div>

      {/* CSS 樣式 */}
      <style>{`
        @keyframes sakura-fall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes float-1 {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(calc(100vw + 100px));
          }
        }
        
        @keyframes float-2 {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(calc(100vw + 100px));
          }
        }
        
        @keyframes float-3 {
          0% {
            transform: translateX(-100px);
          }
          100% {
            transform: translateX(calc(100vw + 100px));
          }
        }
      `}</style>
    </div>
  );
};