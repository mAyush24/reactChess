# React Chess

A multiplayer chess game built with React, Socket.io, and Express.

![Chess Game Screenshot](https://i.imgur.com/placeholder.jpg)

## Features

- Real-time multiplayer chess game
- Game rooms with unique room IDs
- Spectator mode for watching games
- Live chat
- Responsive design
- Game state persistence

## Technologies Used

- **Frontend**: React, React Router, Socket.io Client, Chess.js, React Chessboard
- **Backend**: Node.js, Express, Socket.io
- **Build Tools**: Vite

## Project Structure

```
reactChess/
├── client/              # Frontend React application
│   ├── public/          # Static files
│   ├── src/             # Source files
│   │   ├── assets/      # CSS and other assets
│   │   ├── components/  # React components
│   │   ├── context/     # React context providers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   └── utils/       # Utility functions
│   ├── .env             # Environment variables
│   └── ...
├── server/              # Backend Node.js application
│   ├── index.js         # Server entry point
│   ├── .env             # Environment variables
│   └── ...
└── README.md            # Project documentation
```

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/reactChess.git
   cd reactChess
   ```

2. Install dependencies for the server:
   ```bash
   cd server
   npm install
   ```

3. Install dependencies for the client:
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. In a separate terminal, start the client:
   ```bash
   cd client
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## How to Play

1. Open the application in your browser
2. Enter the lobby by clicking "Enter Lobby" on the home page
3. Create a new room or join an existing one
4. Share the room ID with a friend to play together
5. Anyone can join as a spectator once two players have joined
