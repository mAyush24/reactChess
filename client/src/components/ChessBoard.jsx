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
  const [winner, setWinner] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  
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
      // Clear any selection when the board updates
      setSelectedSquare(null);
      setPossibleMoves([]);
    });
    
    // Listen for game over events
    socket.on('gameOver', ({ reason, winner }) => {
      setGameOver(true);
      setGameOverReason(reason);
      if (winner) {
        setWinner(winner);
      }
    });
    
    // Listen for player disconnection
    socket.on('playerDisconnected', ({ color }) => {
      if ((playerColor === 'white' && color === 'black') || 
          (playerColor === 'black' && color === 'white')) {
        setOpponentDisconnected(true);
        // Even if we didn't receive a gameOver event, mark the game as over
        setGameOver(true);
        setGameOverReason('disconnect');
        setWinner(playerColor);
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
    
    // Clear selection and possible moves when using drag and drop
    setSelectedSquare(null);
    setPossibleMoves([]);
    
    // Check if this move is a pawn promotion
    if (isPawnPromotion(sourceSquare, targetSquare)) {
      setPromotionSquare(targetSquare);
      setPendingMove({ from: sourceSquare, to: targetSquare });
      return true; // Return true to allow the piece to be moved on the board
    }
    
    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Only used for non-promotion moves or fallback
    };
    
    const moveResult = makeMove(move);
    
    if (moveResult) {
      // Emit move to server
      socket.emit('makeMove', { roomId, move });
      return true;
    }
    
    return false;
  };

  // Handle promotion piece selection
  const handlePromotionPieceSelection = (piece) => {
    if (!pendingMove) return;
    
    const move = {
      from: pendingMove.from,
      to: pendingMove.to,
      promotion: piece
    };
    
    const moveResult = makeMove(move);
    
    if (moveResult) {
      // Emit move to server
      socket.emit('makeMove', { roomId, move });
    }
    
    // Reset promotion state
    setPromotionSquare(null);
    setPendingMove(null);
  };

  // Cancel promotion selection
  const cancelPromotion = () => {
    // Reset the board to before the pending move
    const newGame = new Chess(fen);
    setGame(newGame);
    setPromotionSquare(null);
    setPendingMove(null);
  };

  // Function to check if move is a pawn promotion
  const isPawnPromotion = (sourceSquare, targetSquare) => {
    const piece = game.get(sourceSquare);
    
    // Check if the piece is a pawn
    if (piece?.type !== 'p') return false;
    
    // For white pawns, check if target is on 8th rank
    if (piece.color === 'w' && targetSquare[1] === '8') return true;
    
    // For black pawns, check if target is on 1st rank
    if (piece.color === 'b' && targetSquare[1] === '1') return true;
    
    return false;
  };

  const getGameStatus = () => {
    if (gameOver) {
      switch (gameOverReason) {
        case 'checkmate':
          return `Checkmate! ${playerTurn === 'w' ? 'Black' : 'White'} wins!`;
        case 'forfeit':
          return `Game over! ${winner === 'white' ? 'White' : 'Black'} wins by forfeit!`;
        case 'disconnect':
          return `Opponent disconnected. You win!`;
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
    
    if (opponentDisconnected) {
      return 'Opponent disconnected. Game over!';
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

  // Calculate possible moves for a selected piece
  const getPossibleMovesForPiece = (square) => {
    const moves = [];
    
    if (!game) return moves;
    
    try {
      // Get all possible moves in the current position
      const legalMoves = game.moves({ square, verbose: true });
      
      // Extract target squares
      return legalMoves.map(move => move.to);
    } catch (error) {
      console.error('Error calculating moves:', error);
      return moves;
    }
  };
  
  // Handle square click to select a piece and show possible moves
  const onSquareClick = (square) => {
    // Don't allow interaction if spectator, game over, or opponent disconnected
    if (isSpectator || gameOver || opponentDisconnected) return;
    
    // Check if it's the player's turn
    if ((playerTurn === 'w' && playerColor !== 'white') || 
        (playerTurn === 'b' && playerColor !== 'black')) return;
    
    const piece = game.get(square);
    
    // If a piece is already selected
    if (selectedSquare) {
      // Check if the clicked square is a valid move destination
      if (possibleMoves.includes(square)) {
        // If it's a valid move, execute it
        const move = {
          from: selectedSquare,
          to: square,
          promotion: 'q' // This will be handled by the promotion UI if needed
        };
        
        // Check if this move is a pawn promotion
        if (isPawnPromotion(selectedSquare, square)) {
          setPromotionSquare(square);
          setPendingMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setPossibleMoves([]);
          return;
        }
        
        const result = makeMove(move);
        
        if (result) {
          socket.emit('makeMove', { roomId, move });
        }
        
        // Clear selection
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      } 
      
      // If clicked on own piece, select it instead
      if (piece && 
          ((piece.color === 'w' && playerColor === 'white') || 
           (piece.color === 'b' && playerColor === 'black'))) {
        setSelectedSquare(square);
        setPossibleMoves(getPossibleMovesForPiece(square));
        return;
      }
      
      // If clicked elsewhere, clear selection
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }
    
    // If no piece is selected yet and clicked on empty square, do nothing
    if (!piece) return;
    
    // If clicked on our own piece, select it and show possible moves
    if ((piece.color === 'w' && playerColor === 'white') || 
        (piece.color === 'b' && playerColor === 'black')) {
      setSelectedSquare(square);
      setPossibleMoves(getPossibleMovesForPiece(square));
      return;
    }
  };

  return (
    <div className="chess-board-container">
      <div className="game-info">
        {/* <h2>Room ID: {roomId}</h2> */}
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
          onSquareClick={onSquareClick}
          boardOrientation={playerColor === 'black' ? 'black' : 'white'}
          customBoardStyle={{
            borderRadius: '5px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
            width: '20rem',
            height: '20rem',
          }}
          customDarkSquareStyle={{ backgroundColor: '#779952' }}
          customLightSquareStyle={{ backgroundColor: '#edeed1' }}
          customSquareStyles={{
            // Highlight last move
            ...(lastMove ? {
              [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
              [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
            } : {}),
            // Highlight selected square
            ...(selectedSquare ? {
              [selectedSquare]: { backgroundColor: 'rgba(73, 136, 245, 0.5)' }
            } : {}),
            // Highlight possible moves
            ...possibleMoves.reduce((styles, square) => {
              // If the square contains an opponent's piece, show as capturable
              const piece = game.get(square);
              if (piece) {
                styles[square] = { 
                  backgroundColor: 'rgba(245, 73, 73, 0.4)', // Red background for capturable pieces
                  boxShadow: 'inset 0 0 0 3px rgba(245, 73, 73, 0.7)' // Red border for emphasis
                };
              } else {
                styles[square] = { 
                  background: 'radial-gradient(circle, rgba(73, 136, 245, 0.4) 25%, transparent 25%)',
                  borderRadius: '50%'
                };
              }
              return styles;
            }, {})
          }}
          areArrowsAllowed={false}
          showBoardNotation={true}
        />
        
        {/* Promotion Selection UI */}
        {promotionSquare && (
          <div className="promotion-selection">
            <div className="promotion-overlay" onClick={cancelPromotion}></div>
            <div className="promotion-options">
              <div className="promotion-title">Choose promotion piece:</div>
              <div className="promotion-pieces">
                <button onClick={() => handlePromotionPieceSelection('q')}>
                  {playerTurn === 'w' ? '♕' : '♛'} Queen
                </button>
                <button onClick={() => handlePromotionPieceSelection('r')}>
                  {playerTurn === 'w' ? '♖' : '♜'} Rook
                </button>
                <button onClick={() => handlePromotionPieceSelection('b')}>
                  {playerTurn === 'w' ? '♗' : '♝'} Bishop
                </button>
                <button onClick={() => handlePromotionPieceSelection('n')}>
                  {playerTurn === 'w' ? '♘' : '♞'} Knight
                </button>
              </div>
              <button className="cancel-button" onClick={cancelPromotion}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessBoard; 