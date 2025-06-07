import WebSocket from 'ws';

export interface Card {
    id: number;
    value: string;
    isFlipped: boolean;
    isMatched: boolean;
}

export interface Client {
    ws: WebSocket;
    nickname: string;
    roomId: string;
    isHost: boolean;
    score: number;
    gameFinished: boolean;
}

export interface GameData {
    cards: Card[];
    gameTime: number;
    gameSettings?: {
        numPairs: number;
        gameDuration: number;
    };
}

export interface Room {
    id: string;
    hostClient: Client | null;
    clients: Map<WebSocket, Client>;
    cards: Card[];
    gameTime: number;
    totalPlayers: number;
    playersReady: Map<string, boolean>;
    waitingForPlayers: boolean;
    gameStarted: boolean;
    gameEnded: boolean;
    timer: NodeJS.Timeout | null;
    gameData?: GameData;
    flippedCards?: number[];
}