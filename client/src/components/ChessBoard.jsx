import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useSocket } from '../context/SocketContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  const [bothPlayersConnected, setBothPlayersConnected] = useState(false);
  const [gameStartCountdown, setGameStartCountdown] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(true);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [showSpectatorControls, setShowSpectatorControls] = useState(false);
  
  const countdownTimerRef = useRef(null);
  const { socket } = useSocket();
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Prevent navigation without confirmation during active game
  useEffect(() => {
    if (!gameOver && !opponentDisconnected && !isSpectator && bothPlayersConnected) {
      // This function runs when the user tries to navigate away
      const handleBeforeUnload = (e) => {
        const message = "Leaving the game will count as a forfeit. Are you sure you want to leave?";
        e.preventDefault();
        e.returnValue = message;
        return message;
      };
      
      // Handle browser back button
      const handlePopState = (e) => {
        // Show our custom leave confirmation dialog
        setShowLeaveConfirmation(true);
        // This prevents the default back navigation
        window.history.pushState(null, document.title, window.location.href);
        e.preventDefault();
        return false;
      };
      
      // Add push state to replace the current history entry
      window.history.pushState(null, document.title, window.location.href);
      
      // Add event listeners
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [gameOver, opponentDisconnected, isSpectator, bothPlayersConnected]);

  // Start countdown when both players are connected - only for active players, not spectators
  useEffect(() => {
    if (bothPlayersConnected && gameStartCountdown === null && !gameOver && !opponentDisconnected && !isSpectator) {
      setGameStartCountdown(3);
      
      countdownTimerRef.current = setInterval(() => {
        setGameStartCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [bothPlayersConnected, gameOver, opponentDisconnected, isSpectator]);

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
        
        // Set connection status based on players in the room
        if (response.playersConnected === 2) {
          setBothPlayersConnected(true);
          setWaitingForOpponent(false);
        } else {
          setBothPlayersConnected(false);
          setWaitingForOpponent(true);
        }
        
        // Get move history if available
        if (response.moveHistory && response.moveHistory.length > 0) {
          setMoveHistory(response.moveHistory);
          setCurrentMoveIndex(response.moveHistory.length - 1);
        }
        
        // If game is over, enable spectator controls
        if (isSpectator && (response.status === 'ended' || response.gameOver)) {
          setShowSpectatorControls(true);
        }
      }
    });
    
    // Listen for board updates
    socket.on('boardUpdate', ({ fen, lastMove, turn, moveHistory }) => {
      const newGame = new Chess(fen);
      setGame(newGame);
      setFen(fen);
      setPlayerTurn(turn);
      if (lastMove) {
        setLastMove(lastMove);
      }
      // Update move history if available
      if (moveHistory) {
        setMoveHistory(moveHistory);
        setCurrentMoveIndex(moveHistory.length - 1);
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
      
      // Enable spectator controls when game is over
      if (isSpectator) {
        setShowSpectatorControls(true);
      }
    });
    
    // Listen for player connection/disconnection
    socket.on('playerConnected', ({ playersCount }) => {
      if (playersCount === 2) {
        setBothPlayersConnected(true);
        setWaitingForOpponent(false);
      }
    });
    
    // Listen for player disconnection
    socket.on('playerDisconnected', ({ color, playersCount }) => {
      if (playersCount < 2) {
        setBothPlayersConnected(false);
        setWaitingForOpponent(true);
      }
      
      if ((playerColor === 'white' && color === 'black') || 
          (playerColor === 'black' && color === 'white')) {
        setOpponentDisconnected(true);
        // Even if we didn't receive a gameOver event, mark the game as over
        setGameOver(true);
        setGameOverReason('disconnect');
        setWinner(playerColor);
      }
      
      // Enable spectator controls if both players have left and user is spectator
      if (isSpectator && playersCount === 0) {
        setShowSpectatorControls(true);
      }
    });
    
    // Listen for room status updates
    socket.on('roomStatusUpdate', ({ status }) => {
      if (status === 'ended' && isSpectator) {
        setShowSpectatorControls(true);
      }
    });
    
    return () => {
      socket.off('boardUpdate');
      socket.off('gameOver');
      socket.off('playerDisconnected');
      socket.off('playerConnected');
      socket.off('roomStatusUpdate');
    };
  }, [socket, roomId, playerColor, isSpectator]);

  // Handle drop piece on the board
  const onDrop = (sourceSquare, targetSquare) => {
    // Don't allow moves if waiting for opponent or during countdown
    if (waitingForOpponent || (gameStartCountdown !== null && gameStartCountdown > 0)) {
      return false;
    }
    
    if (isSpectator || gameOver || opponentDisconnected) return false;
    if ((playerTurn === 'w' && playerColor !== 'white') || 
        (playerTurn === 'b' && playerColor !== 'black')) return false;
    
    // Clear selection and possible moves when using drag and drop
    setSelectedSquare(null);
    setPossibleMoves([]);
    
    // Check if this move is a pawn promotion
    if (isPawnPromotion(sourceSquare, targetSquare)) {
      // Show our custom promotion UI
      setPromotionSquare(targetSquare);
      setPendingMove({ from: sourceSquare, to: targetSquare });
      return true; // Allow the piece to move visually on the board
    }
    
    // For non-promotion moves, process normally
    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Only used for non-promotion moves
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
    
    // Create the complete move object with the selected promotion piece
    const move = {
      from: pendingMove.from,
      to: pendingMove.to,
      promotion: piece
    };
    
    // Execute the move on the local board
    const moveResult = makeMove(move);
    
    if (moveResult) {
      // Send the move to the server
      socket.emit('makeMove', { roomId, move });
    } else {
      console.error('Invalid promotion move');
      // Reset the board to its previous state if the move was invalid
      const newGame = new Chess(fen);
      setGame(newGame);
    }
    
    // Reset promotion state regardless of move success
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
    // Show waiting message if opponent hasn't connected
    if (waitingForOpponent && !isSpectator) {
      return 'Waiting for opponent to join...';
    }
    
    // Show countdown if game is about to start - only for active players
    if (gameStartCountdown !== null && gameStartCountdown > 0 && !isSpectator) {
      return `Game starting in ${gameStartCountdown}...`;
    }

    if (gameOver ) {
      switch (gameOverReason) {
        case 'checkmate':
          return `Checkmate! ${playerTurn === 'w' ? 'Black' : 'White'} wins!`;
        case 'forfeit':
          return `Game over! ${winner === 'white' ? 'White' : 'Black'} wins by forfeit!`;
        case 'disconnect':
          return isSpectator 
            ? `Game ended: Player disconnected` 
            : `Opponent disconnected. You win!`;
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
      return isSpectator 
        ? 'Game ended: Player disconnected' 
        : 'Opponent disconnected. Game over!';
    }
    
    if (isSpectator && !gameOver) {
      // if (showSpectatorControls) {
      //   return `Viewing game history - Move ${currentMoveIndex + 1}/${moveHistory.length}`;
      // }
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
    // If the game is still running and not in spectator mode, show confirmation
    if (!gameOver && !opponentDisconnected && !isSpectator) {
      setShowLeaveConfirmation(true);
    } else {
      // Otherwise, just navigate away
      navigate('/');
    }
  };

  const confirmLeaveGame = () => {
    // Emit forfeit event to the server
    if (socket && socket.connected) {
      socket.emit('forfeitGame', { roomId, color: playerColor });
    }
    navigate('/');
  };

  const cancelLeaveGame = () => {
    setShowLeaveConfirmation(false);
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
    // Don't allow moves if waiting for opponent or during countdown
    if (waitingForOpponent || (gameStartCountdown !== null && gameStartCountdown > 0)) {
      return;
    }
    
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
        // Check if this move is a pawn promotion
        if (isPawnPromotion(selectedSquare, square)) {
          // Show our custom promotion UI
          setPromotionSquare(square);
          setPendingMove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setPossibleMoves([]);
          return;
        }
        
        // For non-promotion moves, process normally
        const move = {
          from: selectedSquare,
          to: square,
          promotion: 'q' // Only used for non-promotion moves
        };
        
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

  // Spectator replay controls
  const handleUndoMove = () => {
    if (!isSpectator || currentMoveIndex < 0) return;
    
    // Show previous position
    if (currentMoveIndex > 0) {
      const previousIndex = currentMoveIndex - 1;
      const previousPosition = moveHistory[previousIndex];
      
      if (previousPosition) {
        const newGame = new Chess(previousPosition.fen);
        setGame(newGame);
        setFen(previousPosition.fen);
        setPlayerTurn(previousPosition.turn);
        setLastMove(previousPosition.lastMove);
        setCurrentMoveIndex(previousIndex);
      } else if (previousIndex === 0) {
        // Go to initial position
        const newGame = new Chess();
        setGame(newGame);
        setFen(newGame.fen());
        // setPlayerTurn('w');
        setLastMove(null);
        setCurrentMoveIndex(-1);
      }
    } else if (currentMoveIndex === 0) {
      // Go to initial position
      const newGame = new Chess();
      setGame(newGame);
      setFen(newGame.fen());
      // setPlayerTurn('w');
      setLastMove(null);
      setCurrentMoveIndex(-1);
    }
  };
  
  const handleRedoMove = () => {
    if (!isSpectator || currentMoveIndex >= moveHistory.length - 1) return;
    
    // Show next position
    const nextIndex = currentMoveIndex + 1;
    const nextPosition = moveHistory[nextIndex];
    
    if (nextPosition) {
      const newGame = new Chess(nextPosition.fen);
      setGame(newGame);
      setFen(nextPosition.fen);
      setPlayerTurn(nextPosition.turn);
      setLastMove(nextPosition.lastMove);
      setCurrentMoveIndex(nextIndex);
    }
  };

  return (
    <div className="chess-board-container">
      <div className="game-info">
        {/* <h2>Room ID: {roomId}</h2> */}
        <div className="game-controls">
          
          
          {(gameOver || opponentDisconnected) && (
            <button className="exit-button" onClick={exitGame}>
              Back to Home
            </button>
          )}
          {/* Add leave button for active games */}
          {!gameOver && !opponentDisconnected && !isSpectator && (
            <button className="leave-button" onClick={() => setShowLeaveConfirmation(true)}>
              Leave Game
            </button>
          )}
          {/* {isSpectator && (
            <button className="leave-button" onClick={() => navigate('/lobby')}>
              Back to Lobby
            </button>
          )} */}
        </div>
        <div className="status-message" 
          data-countdown={gameStartCountdown !== null && gameStartCountdown > 0 && !isSpectator ? "true" : "false"}
          data-waiting={waitingForOpponent && !isSpectator ? "true" : "false"}>
          {getGameStatus()}
        </div>
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
          showPromotionDialog={false}
        />

        {/* Show undo/redo controls for spectators after game is over */}
        {isSpectator && showSpectatorControls && (
            <div className="spectator-controls">
              <button 
                className="spectator-button" 
                onClick={handleUndoMove} 
                disabled={currentMoveIndex < 0}
              >
                ← Previous
              </button>
              <button 
                className="spectator-button" 
                onClick={handleRedoMove} 
                disabled={currentMoveIndex >= moveHistory.length - 1}
              >
                Next →
              </button>
            </div>
        )}
        { showSpectatorControls && (
          <div className='status-message'>
            Viewing game history - Move {currentMoveIndex + 1}/{moveHistory.length}
          </div>
        )}
        
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
      
      {/* Leave Game Confirmation Modal */}
      {showLeaveConfirmation && (
        <div className="promotion-selection">
          <div className="promotion-overlay"></div>
          <div className="promotion-options">
            <div className="promotion-title">Leave Game?</div>
            <p className="confirmation-message">
              Leaving the game will count as a forfeit and you will lose the match.
            </p>
            <div className="confirmation-buttons">
              <button className="cancel-button" onClick={cancelLeaveGame}>
                Stay
              </button>
              <button className="confirm-button" onClick={confirmLeaveGame}>
                Leave & Forfeit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessBoard; 