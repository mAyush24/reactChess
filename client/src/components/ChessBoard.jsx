import React, { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useSocket } from '../context/SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import '../assets/ChessBoard.css';

const ChessBoard = ({ playerColor, isSpectator }) => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [lastMove, setLastMove] = useState(null);
  const [playerTurn, setPlayerTurn] = useState('w');
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  
  const { socket } = useSocket();
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Function to handle making a move
  const makeMove = useCallback((move) => {
    try {
      const result = game.move(move);
      if (result) {
        setFen(game.fen());
        setPlayerTurn(game.turn());
        setLastMove({ from: move.from, to: move.to });
        
        // Check for game over
        if (game.isGameOver()) {
          let reason = '';
          if (game.isCheckmate()) reason = 'checkmate';
          else if (game.isDraw()) reason = 'draw';
          else if (game.isStalemate()) reason = 'stalemate';
          else if (game.isThreefoldRepetition()) reason = 'repetition';
          else if (game.isInsufficientMaterial()) reason = 'insufficient material';
          
          setGameOver(true);
          setGameOverReason(reason);
        }
        
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    return false;
  }, [game]);

  // Handle receiving game updates
  useEffect(() => {
    if (!socket || !roomId) return;
    
    // Get initial board state
    socket.emit('getBoardState', { roomId }, (response) => {
      if (response && response.fen) {
        const newGame = new Chess(response.fen);
        setGame(newGame);
        setFen(response.fen);
        setPlayerTurn(response.turn);
        if (response.lastMove) {
          setLastMove(response.lastMove);
        }
      }
    });
    
    // Listen for board updates
    socket.on('boardUpdate', ({ fen, lastMove, turn }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
      setFen(fen);
      setPlayerTurn(turn);
      if (lastMove) {
        setLastMove(lastMove);
      }
    });
    
    // Listen for game over events
    socket.on('gameOver', ({ reason }) => {
      setGameOver(true);
      setGameOverReason(reason);
    });
    
    // Listen for player disconnection
    socket.on('playerDisconnected', ({ color }) => {
      if ((playerColor === 'white' && color === 'black') || 
          (playerColor === 'black' && color === 'white')) {
        setOpponentDisconnected(true);
      }
    });
    
    return () => {
      socket.off('boardUpdate');
      socket.off('gameOver');
      socket.off('playerDisconnected');
    };
  }, [socket, roomId, playerColor]);

  // Handle drop piece on the board
  const onDrop = (sourceSquare, targetSquare) => {
    if (isSpectator || gameOver || opponentDisconnected) return false;
    if ((playerTurn === 'w' && playerColor !== 'white') || 
        (playerTurn === 'b' && playerColor !== 'black')) return false;
    
    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Always promote to queen for simplicity
    };
    
    const moveResult = makeMove(move);
    
    if (moveResult) {
      // Emit move to server
      socket.emit('makeMove', { roomId, move });
      return true;
    }
    
    return false;
  };

  const getGameStatus = () => {
    if (opponentDisconnected) {
      return 'Opponent disconnected';
    }
    
    if (gameOver) {
      switch (gameOverReason) {
        case 'checkmate':
          return `Checkmate! ${playerTurn === 'w' ? 'Black' : 'White'} wins!`;
        case 'draw':
          return 'Game ended in a draw';
        case 'stalemate':
          return 'Stalemate! Game ended in a draw';
        case 'repetition':
          return 'Threefold repetition! Game ended in a draw';
        case 'insufficient material':
          return 'Insufficient material! Game ended in a draw';
        default:
          return 'Game over!';
      }
    }
    
    if (isSpectator) {
      return `You are spectating. ${playerTurn === 'w' ? 'White' : 'Black'}'s turn`;
    }
    
    if ((playerTurn === 'w' && playerColor === 'white') || 
        (playerTurn === 'b' && playerColor === 'black')) {
      return 'Your turn';
    } else {
      return "Opponent's turn";
    }
  };

  const exitGame = () => {
    navigate('/lobby');
  };

  return (
    <div className="chess-board-container">
      <div className="game-info">
        <h2>Room ID: {roomId}</h2>
        <div className="status-message">{getGameStatus()}</div>
        {(gameOver || opponentDisconnected) && (
          <button className="exit-button" onClick={exitGame}>
            Back to Lobby
          </button>
        )}
      </div>
      
      <div className="board-wrapper">
        <Chessboard
          id="ChessBoard"
          position={fen}
          onPieceDrop={onDrop}
          boardOrientation={playerColor === 'black' ? 'black' : 'white'}
          customBoardStyle={{
            borderRadius: '5px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
          }}
          customDarkSquareStyle={{ backgroundColor: '#779952' }}
          customLightSquareStyle={{ backgroundColor: '#edeed1' }}
          customSquareStyles={{
            ...(lastMove ? {
              [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
              [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
            } : {})
          }}
        />
      </div>
      
      <div className="player-info">
        <div className="player-role">
          {isSpectator ? 'Spectating' : `Playing as ${playerColor}`}
        </div>
      </div>
    </div>
  );
};

export default ChessBoard; 