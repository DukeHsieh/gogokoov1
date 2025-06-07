# Gogokoo

A real-time multiplayer gaming platform featuring memory card games, built with React frontend and Go backend with WebSocket support.

## Project Structure

```
gogokoo/
├── client/                 # React frontend application
│   ├── src/               # React source code
│   │   ├── components/    # Shared React components
│   │   ├── games/         # Game-specific components
│   │   │   └── memory-card/ # Memory card game implementation
│   │   ├── platform/      # Platform components (rooms, lobbies)
│   │   ├── config/        # Configuration files
│   │   └── utils/         # Utility functions
│   ├── package.json       # Client dependencies
│   └── tsconfig.json      # Client TypeScript config
├── server/                # Go backend application
│   ├── core/              # Core server functionality
│   │   ├── message/       # Message handling
│   │   ├── websocket/     # WebSocket management
│   │   └── types.go       # Core type definitions
│   ├── games/             # Game logic implementations
│   │   └── memory/        # Memory card game logic
│   ├── platform/          # Platform services
│   │   ├── api/           # REST API handlers
│   │   └── room/          # Room management
│   ├── utils/             # Utility functions
│   │   └── avatar.go      # Avatar generation
│   ├── main.go            # Main server entry point
│   ├── go.mod             # Go module dependencies
│   └── Dockerfile         # Docker configuration
├── package.json           # Root package.json for orchestration
├── README.md
└── .gitignore
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gogokoo
   ```

2. **Install frontend dependencies**
   ```bash
   npm install --prefix client
   ```

3. **Start the Go backend server**
   ```bash
   cd server
   go run main.go
   ```

4. **Start the React development server**
   ```bash
   cd client
   npm start
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000 (React dev server)
   - Backend API: http://localhost:8080 (Go server)

## Available Scripts

### Frontend (Client)

```bash
cd client
npm start          # Start React development server
npm run build      # Build for production
npm test           # Run tests
```

### Backend (Server)

```bash
cd server
go run main.go     # Start Go development server
go build           # Build binary for production
go test ./...      # Run tests
```

### Root Level Commands

- `npm run dev` - Start Go server (backend only)
- `npm run dev:client` - Start React development server
- `npm run build:client` - Build React app for production
- `npm test` - Run client tests

## Production Deployment

1. **Build the React frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Build the Go backend**
   ```bash
   cd server
   go build -o gogokoo-server
   ```

3. **Run the production server**
   ```bash
   cd server
   ./gogokoo-server
   ```

The Go server serves the built React app and handles API requests and WebSocket connections.

## Development Workflow

1. **Frontend Development**: Work in `client/src/` directory
   - Game components in `client/src/games/memory-card/`
   - Platform components in `client/src/platform/`
   - Shared components in `client/src/components/`

2. **Backend Development**: Work in `server/` directory
   - Game logic in `server/games/`
   - API handlers in `server/platform/api/`
   - WebSocket handling in `server/core/websocket/`

3. **Hot Reload**: Frontend supports hot reloading, backend requires restart
4. **API Testing**: Backend runs on port 8080, frontend dev server proxies API calls

## Features

- 🎮 Real-time multiplayer memory card game
- 🔌 WebSocket communication for instant updates
- 🏠 Room-based game sessions with unique codes
- 👤 Random avatar generation with Ghibli characters
- 📱 Responsive design for mobile and desktop
- 🎯 TypeScript support for frontend
- 🚀 High-performance Go backend
- 🎨 Material-UI components with modern design
- 🔄 Real-time player list updates
- 📊 Live game statistics and scoring

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for components and theming
- **React Router** for navigation
- **Axios** for HTTP requests
- **QR Code React** for room sharing
- **WebSocket** for real-time communication

### Backend
- **Go 1.21** for high-performance server
- **Gin** web framework for REST API
- **Gorilla WebSocket** for real-time features
- **Docker** support for containerization

### Development Tools
- **Create React App** for frontend tooling
- **Go modules** for dependency management
- **TypeScript** for frontend type safety
- **Material-UI** design system

## Project Architecture

This project follows a clean architecture with separate frontend and backend:

- **Separation of Concerns**: React frontend and Go backend are completely separate
- **Independent Deployment**: Each part can be deployed independently
- **Microservices Ready**: Modular backend structure supports scaling
- **Type Safety**: TypeScript for frontend, Go's strong typing for backend
- **Real-time Communication**: WebSocket-based architecture for instant updates
- **Game Engine**: Extensible game system supporting multiple game types

## Game Features

### Memory Card Game
- **Real-time Multiplayer**: Up to multiple players per room
- **Live Scoring**: Real-time score updates and rankings
- **Player Avatars**: Random Ghibli character avatars
- **Game States**: Waiting, playing, and ended states with smooth transitions
- **Card Matching**: Classic memory game mechanics with flip animations
- **Timer System**: Configurable game duration with live countdown

### Platform Features
- **Room Management**: Create and join rooms with unique codes
- **Player Management**: Real-time player list with avatars and nicknames
- **QR Code Sharing**: Easy room sharing via QR codes
- **Responsive Design**: Works seamlessly on desktop and mobile devices
