// 卡片記憶遊戲計時器Hook
import { useEffect, useRef } from 'react';

interface UseGameTimerProps {
  isActive: boolean;
  timeLeft: number;
  onTimeUpdate: (timeLeft: number) => void;
  onTimeUp?: () => void;
}

export const useGameTimer = ({ 
  isActive, 
  timeLeft, 
  onTimeUpdate, 
  onTimeUp 
}: UseGameTimerProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(timeLeft);

  // 更新當前時間引用
  useEffect(() => {
    currentTimeRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        currentTimeRef.current -= 1;
        onTimeUpdate(currentTimeRef.current);
        
        if (currentTimeRef.current <= 0) {
          onTimeUp?.();
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, timeLeft, onTimeUpdate, onTimeUp]);

  // 清理計時器
  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { clearTimer };
};