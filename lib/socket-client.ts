'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useRef } from 'react';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket instance for this component
    if (!socketRef.current) {
      const socketInstance = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 100, // Reduced from 1000ms for faster reconnection
        reconnectionAttempts: Infinity,
        timeout: 20000,
        autoConnect: true,
      });

      socketRef.current = socketInstance;

      socketInstance.on('connect', () => {
        console.log('Socket: Connected to server, ID:', socketInstance.id);
        setSocket(socketInstance);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket: Disconnected from server:', reason);
        setSocket(null);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket: Connection error:', error);
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('Socket: Reconnected after', attemptNumber, 'attempts');
        setSocket(socketInstance);
      });

      // Set initial state if already connected
      if (socketInstance.connected) {
        setSocket(socketInstance);
      }
    } else {
      // Socket already exists, just update state if connected
      if (socketRef.current.connected) {
        setSocket(socketRef.current);
      }
    }

    // Handle visibility change to reconnect instantly when app comes to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socketRef.current) {
        console.log('Socket: App became visible, checking connection...');
        if (!socketRef.current.connected) {
          console.log('Socket: Disconnected, forcing immediate reconnection...');
          socketRef.current.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clean up socket on unmount
      if (socketRef.current) {
        console.log('Socket: Cleaning up socket connection');
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, []);

  return socket;
}

