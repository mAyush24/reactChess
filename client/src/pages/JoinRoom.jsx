import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import '../assets/CreateJoinRoom.css';

const JoinRoom = () => {
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
    
    socket.emit('joinRoom', { roomId: joinRoomId, username }, (response) => {
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

  // Get the appropriate display text for a room
  const getRoomDisplayText = (room) => {
    if (room.status === 'waiting') {
      return `${room.whitePlayer}'s room (waiting)`;
    } else if (room.status === 'playing') {
      return `${room.whitePlayer} vs ${room.blackPlayer || 'Opponent'} (playing)`;
    } else {
      return `${room.whitePlayer}'s room`;
    }
  };

  return (
    <div className="room-container">
      <div className="room-content">
        <h1 className="room-title">Join a Room</h1>
        <p className="room-description">
          Enter your username and join an existing room by ID or from the list below.
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
          
          <div className="form-group">
            <label htmlFor="roomId">Room ID</label>
            <input
              type="text"
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID to join"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="room-buttons">
            <button
              className="room-button join-button"
              onClick={() => joinRoom()}
              disabled={loading || !connected || !roomId}
            >
              {loading ? 'Joining...' : 'Join by Room ID'}
            </button>
            <button
              className="room-button back-button"
              onClick={() => navigate('/')}
            >
              Back to Home
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
                <div 
                  key={room.id} 
                  className="room-item"
                  data-status={room.status}
                >
                  <div className="room-info">
                    <span className="room-name">{getRoomDisplayText(room)}</span>
                    <span className="room-id">ID: {room.id}</span>
                    {room.spectatorCount > 0 && (
                      <span className="spectator-count">👁️ {room.spectatorCount}</span>
                    )}
                  </div>
                  <button
                    className="join-room-button"
                    onClick={() => joinRoom(room.id)}
                    disabled={loading || !connected || !username.trim()}
                  >
                    {room.status === 'playing' ? 'Spectate' : 'Join'}
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

export default JoinRoom; 