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
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store active game rooms
const gameRooms = {};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create a new game room
  socket.on('createRoom', ({ username }, callback) => {
    const roomId = uuidv4().substring(0, 8);
    gameRooms[roomId] = {
      id: roomId,
      players: {
        white: socket.id,
        black: null
      },
      playerUsernames: {
        white: username,
        black: null
      },
      spectators: [],
      game: new Chess(),
      status: 'waiting',
      moveHistory: [],
      gameOver: false,
      hiddenFromListing: false
    };

    socket.join(roomId);
    console.log(`Room created: ${roomId} by ${username} (${socket.id})`);
    callback({ roomId, color: 'white' });
  });

  // Join an existing game room
  socket.on('joinRoom', ({ roomId, username }, callback) => {
    // Check if room exists
    if (!gameRooms[roomId]) {
      callback({ error: 'Room not found' });
      return;
    }

    const room = gameRooms[roomId];
    
    // Don't allow joining if the room is hidden and the user is trying to join as player
    if (room.hiddenFromListing && (!room.players.white || !room.players.black)) {
      callback({ error: 'Room is no longer available' });
      return;
    }

    // Assign player or spectator role
    if (!room.players.white) {
      room.players.white = socket.id;
      room.playerUsernames.white = username;
      socket.join(roomId);
      callback({ color: 'white' });
    } else if (!room.players.black) {
      room.players.black = socket.id;
      room.playerUsernames.black = username;
      room.status = 'playing';
      socket.join(roomId);
      callback({ color: 'black' });
      // Notify both players that the game is starting
      io.to(roomId).emit('gameStart', { fen: room.game.fen() });
      // Emit a playerConnected event with the player count so clients can start the countdown
      io.to(roomId).emit('playerConnected', { playersCount: 2 });
    } else {
      // Join as spectator
      room.spectators.push(socket.id);
      socket.join(roomId);
      callback({ 
        color: 'spectator',
        gameOver: room.gameOver,
        status: room.status 
      });
      // Send current board state to the spectator
      socket.emit('boardUpdate', { 
        fen: room.game.fen(), 
        lastMove: room.lastMove,
        turn: room.game.turn(),
        moveHistory: room.moveHistory
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
        
        // Add move to history
        room.moveHistory.push({
          fen: room.game.fen(),
          lastMove: move,
          turn: room.game.turn()
        });
        
        // Broadcast the updated board to all players and spectators in the room
        io.to(roomId).emit('boardUpdate', { 
          fen: room.game.fen(), 
          lastMove: move,
          turn: room.game.turn(),
          moveHistory: room.moveHistory
        });

        // Check for game over conditions
        if (room.game.isGameOver()) {
          let gameOverReason = '';
          if (room.game.isCheckmate()) gameOverReason = 'checkmate';
          else if (room.game.isDraw()) gameOverReason = 'draw';
          else if (room.game.isStalemate()) gameOverReason = 'stalemate';
          else if (room.game.isThreefoldRepetition()) gameOverReason = 'repetition';
          else if (room.game.isInsufficientMaterial()) gameOverReason = 'insufficient material';
          
          room.gameOver = true;
          room.status = 'ended';
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
      // Calculate the number of players currently connected
      const playersConnected = (room.players.white ? 1 : 0) + (room.players.black ? 1 : 0);
      
      callback({ 
        fen: room.game.fen(), 
        lastMove: room.lastMove,
        turn: room.game.turn(),
        playersConnected: playersConnected,
        moveHistory: room.moveHistory,
        status: room.status,
        gameOver: room.gameOver
      });
    }
  });
  
  // Handle forfeit from player clicking "Leave Game"
  socket.on('forfeitGame', ({ roomId, color }) => {
    const room = gameRooms[roomId];
    if (!room) return;
    
    // Verify the player is who they claim to be
    if ((color === 'white' && room.players.white === socket.id) || 
        (color === 'black' && room.players.black === socket.id)) {
      
      // Mark the game as over
      room.gameOver = true;
      room.status = 'ended';
      
      if (color === 'white') {
        io.to(roomId).emit('gameOver', { reason: 'forfeit', winner: 'black' });
      } else {
        io.to(roomId).emit('gameOver', { reason: 'forfeit', winner: 'white' });
      }
      
      // Update room status
      io.to(roomId).emit('roomStatusUpdate', { status: 'ended' });
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
        // If game was in progress, emit a gameOver event with forfeit reason
        if (room.status === 'playing') {
          room.gameOver = true;
          room.status = 'ended';
          io.to(roomId).emit('gameOver', { reason: 'forfeit', winner: 'black' });
        }
        
        // Count players after this disconnection
        const playersCount = (room.players.white ? 1 : 0) + (room.players.black ? 1 : 0);
        io.to(roomId).emit('playerDisconnected', { color: 'white', playersCount: playersCount });
        
        // If both players are now gone, mark the room as hidden from listing
        if (!room.players.black) {
          room.hiddenFromListing = true;
          io.to(roomId).emit('roomStatusUpdate', { status: 'ended' });
        }
      } else if (room.players.black === socket.id) {
        room.players.black = null;
        // If game was in progress, emit a gameOver event with forfeit reason
        if (room.status === 'playing') {
          room.gameOver = true;
          room.status = 'ended';
          io.to(roomId).emit('gameOver', { reason: 'forfeit', winner: 'white' });
        }
        
        // Count players after this disconnection
        const playersCount = (room.players.white ? 1 : 0) + (room.players.black ? 1 : 0);
        io.to(roomId).emit('playerDisconnected', { color: 'black', playersCount: playersCount });
        
        // If both players are now gone, mark the room as hidden from listing
        if (!room.players.white) {
          room.hiddenFromListing = true;
          io.to(roomId).emit('roomStatusUpdate', { status: 'ended' });
        }
      } else {
        // Handle spectator disconnection
        room.spectators = room.spectators.filter(id => id !== socket.id);
      }
      
      // If no one is in the room, delete it
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
    .filter(room => !room.hiddenFromListing) // Only show rooms that aren't hidden
    .map(room => ({
      id: room.id,
      status: room.status,
      whitePlayer: room.playerUsernames.white,
      blackPlayer: room.playerUsernames.black,
      spectatorCount: room.spectators.length
    }));
  
  res.json(publicRooms);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 