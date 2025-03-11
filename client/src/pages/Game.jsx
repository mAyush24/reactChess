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
  
  // Handle chat messages
  useEffect(() => {
    if (!socket) return;
    
    socket.on('receiveMessage', ({ message, sender }) => {
      setMessages((prevMessages) => [
        ...prevMessages, 
        { text: message, sender, timestamp: new Date() }
      ]);
    });
    
    return () => {
      socket.off('receiveMessage');
    };
  }, [socket]);
  
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
      <div className="game-header">
        <h1>Chess Game</h1>
        <div className="room-info">
          <span>Room ID: {roomId}</span>
          <button className="copy-button" onClick={copyRoomId} title="Copy Room ID">
            📋
          </button>
        </div>
      </div>
      
      <div className="game-content">
        <div className="board-section">
          <ChessBoard
            playerColor={playerColor}
            isSpectator={isSpectator}
          />
        </div>
        
        <div className="chat-section">
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
        </div>
      </div>
      
      <div className="exit-section">
        <button 
          className="exit-button"
          onClick={() => navigate('/lobby')}
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
};

export default Game; 