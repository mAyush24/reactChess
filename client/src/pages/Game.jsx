import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import ChessBoard from '../components/ChessBoard';
import '../assets/Game.css';

const Game = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [playerColor, setPlayerColor] = useState('white');
  const [isSpectator, setIsSpectator] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');

  // Get game state from router or default values
  useEffect(() => {
    if (location.state) {
      setPlayerColor(location.state.playerColor || 'white');
      setIsSpectator(location.state.isSpectator || false);
    } else {
      // If no state is provided, try to join as spectator
      if (socket && connected) {
        socket.emit('joinRoom', roomId, (response) => {
          if (response.error) {
            navigate('/lobby');
          } else {
            setPlayerColor(response.color);
            setIsSpectator(response.color === 'spectator');
          }
        });
      }
    }

    // Get username from session storage
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [location, roomId, socket, connected, navigate]);

  // Handle chat messages and game events
  useEffect(() => {
    if (!socket) return;

    socket.on('receiveMessage', ({ message, sender }) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, sender, timestamp: new Date() }
      ]);
    });

    // Listen for game over events
    socket.on('gameOver', ({ reason }) => {
      setGameOver(true);
      setGameOverReason(reason);

      // Add a system message about the game ending
      const gameOverMessage = getGameOverMessage(reason);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: gameOverMessage, sender: 'System', timestamp: new Date() }
      ]);
    });

    // Listen for player disconnection
    socket.on('playerDisconnected', ({ color }) => {
      // Add a system message about the player disconnecting
      const disconnectMessage = `${color.charAt(0).toUpperCase() + color.slice(1)} player has disconnected`;
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: disconnectMessage, sender: 'System', timestamp: new Date() }
      ]);
    });

    return () => {
      socket.off('receiveMessage');
      socket.off('gameOver');
      socket.off('playerDisconnected');
    };
  }, [socket]);

  // Get an appropriate message for game over
  const getGameOverMessage = (reason) => {
    switch (reason) {
      case 'checkmate':
        return 'Game over by checkmate!';
      case 'forfeit':
        return 'Game over by forfeit! A player has left the game.';
      case 'draw':
        return 'Game ended in a draw.';
      case 'stalemate':
        return 'Game ended in stalemate!';
      case 'repetition':
        return 'Game ended by threefold repetition!';
      case 'insufficient material':
        return 'Game ended due to insufficient material!';
      default:
        return 'Game over!';
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    if (socket && connected) {
      socket.emit('sendMessage', {
        roomId,
        message: newMessage,
        sender: username || `Player (${playerColor})`
      });

      setNewMessage('');
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    // TODO: Show a toast or notification
  };

  return (
    <div className="game-container">
      <div className="game-header flex justify-between items-center">
        <h1>Chess Game</h1>
        <div className="room-info">
          {/* <button
            className="exit-button"
            onClick={() => navigate('/lobby')}
          >
            Back to Lobby
          </button> */}
          <span>Room ID: {roomId} <button className="copy-button" onClick={copyRoomId} title="Copy Room ID">
            📋
          </button></span>
          
        </div>
      </div>

      <div className="game-content">
        <div className="board-section">
        <button
            className="exit-button"
            onClick={() => navigate('/lobby')}
          >
            &#8592;
          </button>
          <ChessBoard
            playerColor={playerColor}
            isSpectator={isSpectator}
          />
        </div>

        {/* <div className="chat-section">
          <div className="chat-header">
            <h3>Game Chat</h3>
          </div>
          
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="no-messages">No messages yet</div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.sender === username ? 'own-message' : ''}`}
                >
                  <div className="message-info">
                    <span className="message-sender">{msg.sender}</span>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))
            )}
          </div>
          
          <form className="chat-input" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={!connected}
            />
            <button type="submit" disabled={!connected || !newMessage.trim()}>
              Send
            </button>
          </form>
        </div> */}
      </div>


    </div>
  );
};

export default Game; 