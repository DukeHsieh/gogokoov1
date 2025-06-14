import { useEffect, useRef, useCallback } from 'react';
import type { RedEnvelopeItem } from '../types/index';
import { isEnvelopeOutOfBounds } from '../../player/envelopeGenerator';

interface UseGameAnimationProps {
  isPlaying: boolean;
  envelopes: RedEnvelopeItem[];
  onUpdatePositions: (deltaTime: number) => void;
  onRemoveOutOfBounds: () => void;
}

export const useGameAnimation = ({
  isPlaying,
  envelopes,
  onUpdatePositions,
  onRemoveOutOfBounds
}: UseGameAnimationProps) => {
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  // 動畫循環
  const animate = useCallback((currentTime: number) => {
    if (!isPlaying) return;

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // 更新紅包位置
    if (deltaTime > 0) {
      onUpdatePositions(deltaTime);
    }

    // 繼續動畫
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, onUpdatePositions]);

  // 定期清理超出螢幕的紅包
  const scheduleCleanup = useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }

    cleanupTimeoutRef.current = setTimeout(() => {
      onRemoveOutOfBounds();
      if (isPlaying) {
        scheduleCleanup();
      }
    }, 1000); // 每秒清理一次
  }, [isPlaying, onRemoveOutOfBounds]);

  // 開始動畫
  const startAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);
    scheduleCleanup();
  }, [animate, scheduleCleanup]);

  // 停止動畫
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = undefined;
    }
  }, []);

  // 監聽遊戲狀態變化
  useEffect(() => {
    if (isPlaying) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [isPlaying, startAnimation, stopAnimation]);

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    startAnimation,
    stopAnimation
  };
};