// API 配置文件
// 根據環境自動檢測API和WebSocket的基礎URL

// 獲取當前頁面的協議和主機
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    
    // 開發環境檢測
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return {
        http: 'http://localhost:8080',
        ws: 'ws://localhost:8080'
      };
    }
    
    // 生產環境使用相同的主機但不同端口
    const httpProtocol = protocol === 'https:' ? 'https:' : 'http:';
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    
    // 假設API服務器在8080端口
    const apiPort = '8080';
    
    return {
      http: `${httpProtocol}//${hostname}:${apiPort}`,
      ws: `${wsProtocol}//${hostname}:${apiPort}`
    };
  }
  
  // 服務器端渲染或其他情況的默認值
  return {
    http: 'http://localhost:8080',
    ws: 'ws://localhost:8080'
  };
};

const { http: API_BASE_URL, ws: WS_BASE_URL } = getBaseUrl();

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  WS_BASE_URL: WS_BASE_URL,
  
  // API 端點
  ENDPOINTS: {
    ROOM_PLAYERS: (roomId: string) => `${API_BASE_URL}/api/rooms/${roomId}/players`,
    // 可以在這裡添加更多API端點
  },
  
  // WebSocket URL 生成器
  WS_URL: (roomId: string, nickname: string, isHost: boolean) => 
    `${WS_BASE_URL}/ws?roomId=${roomId}&nickname=${encodeURIComponent(nickname)}&isHost=${isHost}`
};

// 環境變數覆蓋（如果需要）
if (process.env.REACT_APP_API_URL) {
  API_CONFIG.BASE_URL = process.env.REACT_APP_API_URL;
}

if (process.env.REACT_APP_WS_URL) {
  API_CONFIG.WS_BASE_URL = process.env.REACT_APP_WS_URL;
}

export default API_CONFIG;