import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import '../assets/CreateJoinRoom.css';

const CreateRoom = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  // Create a new game room
  const createRoom = () => {
    if (!connected) {
      setError('Not connected to server');
      return;
    }
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    setLoading(true);
    setError('');
    
    socket.emit('createRoom', { username }, (response) => {
      setLoading(false);
      
      if (response.error) {
        setError(response.error);
      } else {
        // Store username in session storage
        sessionStorage.setItem('username', username);
        // Navigate to the game page
        navigate(`/game/${response.roomId}`, { 
          state: { 
            playerColor: 'white',
            isSpectator: false,
            roomId: response.roomId 
          } 
        });
      }
    });
  };

  return (
    <div className="room-container">
      <div className="room-content">
        <h1 className="room-title">Create a Room</h1>
        <p className="room-description">
          Set your username and create a new chess room. You'll play as white.
        </p>
        
        <div className="room-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="room-buttons">
            <button
              className="room-button create-button"
              onClick={createRoom}
              disabled={loading || !connected}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button
              className="room-button back-button"
              onClick={() => navigate('/')}
            >
              Back to Home
            </button>
          </div>
        </div>
        
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
          {connected ? 'Connected to server' : 'Disconnected from server'}
        </div>
      </div>
    </div>
  );
};

export default CreateRoom; 