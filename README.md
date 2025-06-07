# Gogokoo - Multi-Screen Multi-Player Game

A real-time multiplayer memory card game built with React, Express, and WebSocket.

## Project Structure

```
gogokoo/
├── client/                 # React frontend application
│   ├── src/               # React source code
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   └── ...
│   ├── public/            # Static assets
│   ├── build/             # Built client files (generated)
│   ├── package.json       # Client dependencies
│   └── tsconfig.json      # Client TypeScript config
├── server/                # Express backend application
│   ├── src/               # Server source code
│   │   └── index.ts       # Main server file
│   ├── dist/              # Built server files (generated)
│   ├── package.json       # Server dependencies
│   └── tsconfig.json      # Server TypeScript config
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

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```
   This will start both the React development server and the Express server concurrently.

4. **Open your browser**
   - Frontend: http://localhost:3000 (React dev server)
   - Backend API: http://localhost:80 (Express server)

## Available Scripts

### Root Level Commands

- `npm run install:all` - Install dependencies for root, client, and server
- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server for production
- `npm start` - Start the production server
- `npm run clean` - Remove all build artifacts
- `npm test` - Run client tests

### Individual Development

```bash
# Client only (React dev server on port 3000)
npm run dev:client

# Server only (Express server with nodemon on port 80)
npm run dev:server
```

### Individual Building

```bash
# Build client only
npm run build:client

# Build server only
npm run build:server
```

## Production Deployment

1. **Build the entire project**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

The Express server will serve the built React app and handle API requests on port 80.

## Development Workflow

1. **Frontend Development**: Work in `client/src/` directory
2. **Backend Development**: Work in `server/src/` directory
3. **Hot Reload**: Both client and server support hot reloading in development mode
4. **API Testing**: Backend runs on port 80, frontend proxy handles API calls

## Features

- 🎮 Real-time multiplayer memory card game
- 🔌 WebSocket communication for instant updates
- 🏠 Room-based game sessions with unique codes
- 📱 Responsive design for mobile and desktop
- 🎯 TypeScript support throughout the stack
- 🚀 Optimized production builds

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **WebSocket** for real-time communication

### Backend
- **Express.js** with TypeScript
- **WebSocket (ws)** for real-time features
- **CORS** for cross-origin requests
- **Node.js** runtime

### Development Tools
- **Create React App** for frontend tooling
- **TypeScript Compiler** for backend builds
- **Nodemon** for development hot reload
- **Concurrently** for running multiple processes

## Project Architecture

This project follows a monorepo structure with separate client and server applications:

- **Separation of Concerns**: Frontend and backend are completely separate
- **Independent Deployment**: Each part can be deployed independently
- **Shared Development**: Unified development workflow with npm workspaces
- **Type Safety**: Full TypeScript support across the stack
