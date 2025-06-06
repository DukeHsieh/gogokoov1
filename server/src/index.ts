import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { handleWebSocketConnection } from './websocketHandler';
import { getPlayerList } from './api';

const app = express();
app.use(cors());
app.use(express.json());

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '../../client/build')));

// API endpoint to get player list for a room
app.get('/api/room/:roomId/players', getPlayerList);

const server = http.createServer(app);
// 创建WebSocket服务器实例并将其附加到HTTP服务器
const wss = new WebSocketServer({ server });

// WebSocket服务器
wss.on('connection', handleWebSocketConnection);

const PORT = process.env.PORT || 80;

// All interfaces, types, and WebSocket connection handling have been moved to separate modules

// All message handling functions have been moved to separate modules

// 所有非API路由都返回React應用
app.use((req, res, next) => {
    // 如果請求不是API路由，返回React應用
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../../client/build/index.html'));
    } else {
        next();
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Basic error handling for the server itself
server.on('error', (error) => {
    console.error('Server error:', error);
});