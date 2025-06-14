import { useState, useEffect, useCallback } from 'react';
import WebSocketManager from './WebSocketManager';

export interface UseWebSocketReturn {
  sendMessage: (message: any) => void;
  lastMessage: any;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const wsManager = WebSocketManager.getInstance();

  useEffect(() => {
    // 註冊訊息處理器
    const handleMessage = (message: any) => {
      setLastMessage(message);
    };

    // 註冊連接狀態處理器
    const handleConnectionChange = (status: 'connecting' | 'connected' | 'disconnected') => {
      setConnectionStatus(status);
    };

    // 這裡需要根據實際的 WebSocketManager API 來註冊處理器
    // 由於 WebSocketManager 的具體實現可能不同，這裡提供基本框架
    
    return () => {
      // 清理處理器
    };
  }, [wsManager]);

  const sendMessage = useCallback((message: any) => {
    wsManager.send(message);
  }, [wsManager]);

  return {
    sendMessage,
    lastMessage,
    connectionStatus
  };
};