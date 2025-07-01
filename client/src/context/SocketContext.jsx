import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection with proper configuration
    const newSocket = io(serverUrl, {
      transports: ['polling', 'websocket'], // Start with polling, then upgrade to websocket
      withCredentials: true,
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 60000,
      autoConnect: true,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.log('Connection error:', error);
      setConnected(false);
      // Try to reconnect with polling if websocket fails
      if (newSocket.io.opts.transports.includes('websocket')) {
        console.log('Falling back to polling');
        newSocket.io.opts.transports = ['polling'];
      }
    });

    setSocket(newSocket);

    // Cleanup on component unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext; 