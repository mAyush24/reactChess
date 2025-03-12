import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">Chess <span className="title-subtext">by Ayush Mishra</span></h1>
        
        <p className="home-description">
          Play chess online with friends or join a game as a spectator.
          Create a room or join an existing one in just a few clicks.
        </p>
        <div className="home-buttons">
          <Link to="/create-room" className="home-button primary-button">
            Create a Room
          </Link>
          <Link to="/join-room" className="home-button secondary-button">
            Join a Room
          </Link>
        </div>
        <div className="home-features">
          <div className="feature">
            <div className="feature-icon">♟️</div>
            <h3>Multiplayer</h3>
            <p>Play against friends in real-time</p>
          </div>
          <div className="feature">
            <div className="feature-icon">👀</div>
            <h3>Spectate</h3>
            <p>Watch ongoing matches</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔗</div>
            <h3>Private Rooms</h3>
            <p>Create private game rooms with unique IDs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 