import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import '../assets/Lobby.css';

const Lobby = () => {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  // Fetch available rooms when the component mounts
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/rooms');
        const data = await response.json();
        setAvailableRooms(data);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    fetchRooms();
    
    // Set up polling for room updates every 5 seconds
    const interval = setInterval(fetchRooms, 5000);
    
    return () => clearInterval(interval);
  }, []);

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
    
    socket.emit('createRoom', (response) => {
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

  // Join an existing game room
  const joinRoom = (roomIdToJoin) => {
    if (!connected) {
      setError('Not connected to server');
      return;
    }
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    const joinRoomId = roomIdToJoin || roomId;
    
    if (!joinRoomId) {
      setError('Please enter a room ID');
      return;
    }
    
    setLoading(true);
    setError('');
    
    socket.emit('joinRoom', joinRoomId, (response) => {
      setLoading(false);
      
      if (response.error) {
        setError(response.error);
      } else {
        // Store username in session storage
        sessionStorage.setItem('username', username);
        
        // Navigate to the game page
        navigate(`/game/${joinRoomId}`, { 
          state: { 
            playerColor: response.color,
            isSpectator: response.color === 'spectator',
            roomId: joinRoomId 
          } 
        });
      }
    });
  };

  return (
    <div className="lobby-container">
      <div className="lobby-content">
        <h1 className="lobby-title">Game Lobby</h1>
        
        <div className="lobby-form">
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
          
          <div className="form-group">
            <label htmlFor="roomId">Room ID (for joining)</label>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID to join"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="lobby-buttons">
            <button
              className="lobby-button create-button"
              onClick={createRoom}
              disabled={loading || !connected}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button
              className="lobby-button join-button"
              onClick={() => joinRoom()}
              disabled={loading || !connected || !roomId}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>
        
        <div className="available-rooms">
          <h2>Available Rooms</h2>
          {availableRooms.length === 0 ? (
            <p className="no-rooms">No available rooms. Create one!</p>
          ) : (
            <div className="room-list">
              {availableRooms.map((room) => (
                <div key={room.id} className="room-item">
                  <span className="room-id">Room ID: {room.id}</span>
                  <button
                    className="join-room-button"
                    onClick={() => joinRoom(room.id)}
                    disabled={loading || !connected}
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
          {connected ? 'Connected to server' : 'Disconnected from server'}
        </div>
      </div>
    </div>
  );
};

export default Lobby; 