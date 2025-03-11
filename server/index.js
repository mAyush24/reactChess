const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store active game rooms
const gameRooms = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create a new game room
  socket.on('createRoom', (callback) => {
    const roomId = uuidv4().substring(0, 8);
    gameRooms[roomId] = {
      id: roomId,
      players: {
        white: socket.id,
        black: null
      },
      spectators: [],
      game: new Chess(),
      status: 'waiting'
    };

    socket.join(roomId);
    console.log(`Room created: ${roomId} by ${socket.id}`);
    callback({ roomId, color: 'white' });
  });

  // Join an existing game room
  socket.on('joinRoom', (roomId, callback) => {
    // Check if room exists
    if (!gameRooms[roomId]) {
      callback({ error: 'Room not found' });
      return;
    }

    const room = gameRooms[roomId];

    // Assign player or spectator role
    if (!room.players.white) {
      room.players.white = socket.id;
      socket.join(roomId);
      callback({ color: 'white' });
    } else if (!room.players.black) {
      room.players.black = socket.id;
      room.status = 'playing';
      socket.join(roomId);
      callback({ color: 'black' });
      // Notify both players that the game is starting
      io.to(roomId).emit('gameStart', { fen: room.game.fen() });
    } else {
      // Join as spectator
      room.spectators.push(socket.id);
      socket.join(roomId);
      callback({ color: 'spectator' });
      // Send current board state to the spectator
      socket.emit('boardUpdate', { 
        fen: room.game.fen(), 
        lastMove: room.lastMove,
        turn: room.game.turn()
      });
    }
  });

  // Make a move
  socket.on('makeMove', ({ roomId, move }) => {
    const room = gameRooms[roomId];
    if (!room) return;

    // Check if it's the player's turn
    const isWhiteTurn = room.game.turn() === 'w';
    const isPlayersTurn = 
      (isWhiteTurn && room.players.white === socket.id) || 
      (!isWhiteTurn && room.players.black === socket.id);

    if (!isPlayersTurn) return;

    try {
      const result = room.game.move(move);
      if (result) {
        room.lastMove = move;
        
        // Broadcast the updated board to all players and spectators in the room
        io.to(roomId).emit('boardUpdate', { 
          fen: room.game.fen(), 
          lastMove: move,
          turn: room.game.turn()
        });

        // Check for game over conditions
        if (room.game.isGameOver()) {
          let gameOverReason = '';
          if (room.game.isCheckmate()) gameOverReason = 'checkmate';
          else if (room.game.isDraw()) gameOverReason = 'draw';
          else if (room.game.isStalemate()) gameOverReason = 'stalemate';
          else if (room.game.isThreefoldRepetition()) gameOverReason = 'repetition';
          else if (room.game.isInsufficientMaterial()) gameOverReason = 'insufficient material';
          
          io.to(roomId).emit('gameOver', { reason: gameOverReason });
        }
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  });

  // Request for current board state
  socket.on('getBoardState', ({ roomId }, callback) => {
    const room = gameRooms[roomId];
    if (room) {
      callback({ 
        fen: room.game.fen(), 
        lastMove: room.lastMove,
        turn: room.game.turn()
      });
    }
  });

  // Chat message
  socket.on('sendMessage', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receiveMessage', { message, sender });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Clean up game rooms
    Object.keys(gameRooms).forEach(roomId => {
      const room = gameRooms[roomId];
      
      // Handle player disconnection
      if (room.players.white === socket.id) {
        room.players.white = null;
        io.to(roomId).emit('playerDisconnected', { color: 'white' });
      } else if (room.players.black === socket.id) {
        room.players.black = null;
        io.to(roomId).emit('playerDisconnected', { color: 'black' });
      } else {
        // Handle spectator disconnection
        room.spectators = room.spectators.filter(id => id !== socket.id);
      }
      
      // If both players are gone, mark the room for cleanup
      if (!room.players.white && !room.players.black && room.spectators.length === 0) {
        delete gameRooms[roomId];
        console.log(`Room deleted: ${roomId}`);
      }
    });
  });
});

// API routes
app.get('/api/rooms', (req, res) => {
  const publicRooms = Object.values(gameRooms)
    .filter(room => room.status === 'waiting')
    .map(room => ({
      id: room.id,
      status: room.status
    }));
  
  res.json(publicRooms);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 