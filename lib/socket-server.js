const { Server: SocketIOServer } = require('socket.io');

let io = null;

function initSocketServer(httpServer) {
  if (!io) {
    io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Store socket IDs for teams
    const teamSockets = new Map(); // socketId -> teamId

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      console.log('Total connected clients:', io.sockets.sockets.size);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Notify about disconnection
        const teamId = teamSockets.get(socket.id);
        if (teamId && io) {
          io.emit('team:disconnected', { teamId, socketId: socket.id });
        }
        teamSockets.delete(socket.id);
      });

      // Team registration
      socket.on('team:register', (data) => {
        teamSockets.set(socket.id, data.id);
        socket.broadcast.emit('team:registered', { ...data, socketId: socket.id });
        if (io) {
          io.emit('team:registered', { ...data, socketId: socket.id });
        }
      });

      // Team rejoin
      socket.on('team:rejoin', (data) => {
        console.log('Team rejoining:', data.id, 'Socket:', socket.id);
        teamSockets.set(socket.id, data.id);
        // Notify others that team is back (optional, or just ensure they are registered)
        if (io) {
          io.emit('team:registered', { ...data, socketId: socket.id });
        }
      });

      // Buzzer press
      socket.on('buzzer:press', (data) => {
        if (io) {
          io.emit('buzzer:pressed', data);
        }
      });

      // Buzzer clear
      socket.on('buzzer:clear', () => {
        if (io) {
          io.emit('buzzer:cleared');
        }
      });

      // Question reveal
      socket.on('question:reveal', (data) => {
        if (io) {
          io.emit('question:revealed', data);
        }
      });

      // Answer reveal
      socket.on('answer:reveal', (data) => {
        if (io) {
          io.emit('answer:revealed', data);
        }
      });

      // Score update
      socket.on('score:update', (data) => {
        if (io) {
          io.emit('score:updated', data);
        }
      });

      // Score set (absolute override)
      socket.on('score:set', (data) => {
        if (io) {
          io.emit('score:set', data);
        }
      });

      // Round change
      socket.on('round:change', (data) => {
        if (io) {
          io.emit('round:changed', data);
        }
      });

      // Question completed
      socket.on('question:complete', (data) => {
        console.log('Socket server: ===== Received question:complete =====', data);
        console.log('Socket server: io exists?', !!io);
        console.log('Socket server: Number of connected clients:', io ? io.sockets.sockets.size : 0);

        if (io) {
          // Get list of all connected socket IDs for debugging
          const connectedIds = Array.from(io.sockets.sockets.keys());
          console.log('Socket server: Connected client IDs:', connectedIds);

          // Broadcast to ALL clients including sender
          console.log('Socket server: Broadcasting question:completed to all clients');
          io.emit('question:completed', data);
          console.log('Socket server: Event question:completed broadcasted with data:', JSON.stringify(data));
        } else {
          console.error('Socket server: io is null! Cannot broadcast!');
        }
      });

      // Question uncompleted
      socket.on('question:uncomplete', (data) => {
        console.log('Socket server: Received question:uncomplete', data);
        if (io) {
          // Broadcast to ALL clients including sender
          console.log('Socket server: Broadcasting question:uncompleted to all clients');
          io.emit('question:uncompleted', data);
        }
      });

      // Remove team
      socket.on('team:remove', (data) => {
        if (io) {
          io.emit('team:removed', data);
        }
      });

      // Reset buzzer
      socket.on('buzzer:reset', () => {
        if (io) {
          io.emit('buzzer:reset');
        }
      });

      // Clear question/answer from screen
      socket.on('question:clear', () => {
        if (io) {
          io.emit('question:cleared');
        }
      });

      // Hide question
      socket.on('question:hide', () => {
        if (io) {
          io.emit('question:hidden');
        }
      });

      // Hide answer
      socket.on('answer:hide', () => {
        if (io) {
          io.emit('answer:hidden');
        }
      });

      // Special card reveal
      socket.on('special:reveal', (data) => {
        console.log('Socket server: Received special:reveal', data);
        if (io) {
          io.emit('special:revealed', data);
        }
      });

      // Special card hide
      socket.on('special:hide', (data) => {
        console.log('Socket server: Received special:hide', data);
        if (io) {
          io.emit('special:hide', data);
        }
      });

      // Audio controls
      socket.on('audio:play', (data) => {
        if (io) io.emit('audio:play', data);
      });

      socket.on('audio:pause', (data) => {
        if (io) io.emit('audio:pause', data);
      });

      socket.on('audio:seek', (data) => {
        if (io) io.emit('audio:seek', data);
      });

      // Global game reset - clear all client states
      socket.on('game:reset_all', () => {
        console.log('Socket server: Received game:reset_all, broadcasting to all clients');
        if (io) {
          io.emit('game:reset_all');
        }
      });
    });
  }
  return io;
}

function getSocketServer() {
  return io;
}

module.exports = { initSocketServer, getSocketServer };

