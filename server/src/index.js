require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const prisma = require('./utils/prisma');

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const allianceRoutes = require('./routes/alliance');
const tradeRoutes = require('./routes/trade');
const activityRoutes = require('./routes/activities');

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);

if (!process.env.JWT_SECRET) {
  console.error('Missing required environment variable: JWT_SECRET');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET is shorter than 32 characters. Use a longer secret in production.');
}

const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : '*';

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/alliance', allianceRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/activities', activityRoutes);

// Socket.io for real-time features
const connectedUsers = new Map(); // socketId -> { userId, username, spaceLevel }

io.use(async (socket, next) => {
  try {
    const tokenFromAuth = socket.handshake.auth?.token;
    const authHeader = socket.handshake.headers?.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = tokenFromAuth || tokenFromHeader;

    if (!token) {
      return next(new Error('Unauthorized: missing socket token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        spaceLevel: true
      }
    });

    if (!user) {
      return next(new Error('Unauthorized: user not found'));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error('Unauthorized socket connection'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins a space
  socket.on('join-space', (data) => {
    const userId = socket.user.id;
    const username = socket.user.username;
    const requestedLevel = Number(data?.spaceLevel);
    const safeLevel = Number.isInteger(requestedLevel) && requestedLevel > 0
      ? Math.min(requestedLevel, socket.user.spaceLevel)
      : socket.user.spaceLevel;
    const spaceLevel = safeLevel;
    connectedUsers.set(socket.id, { userId, username, spaceLevel });
    socket.join(`space-${spaceLevel}`);
    
    // Notify others in the space
    socket.to(`space-${spaceLevel}`).emit('user-joined', {
      userId,
      username,
      socketId: socket.id
    });
    
    // Send list of users in this space
    const usersInSpace = Array.from(connectedUsers.entries())
      .filter(([_, user]) => user.spaceLevel === spaceLevel)
      .map(([sid, user]) => ({ ...user, socketId: sid }));
    
    socket.emit('space-users', usersInSpace);
  });

  // User changes space
  socket.on('change-space', (data) => {
    const { oldSpace, newSpace } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      const nextSpace = Number(newSpace);
      if (!Number.isInteger(nextSpace) || nextSpace <= 0 || nextSpace > socket.user.spaceLevel) {
        return;
      }
      socket.leave(`space-${oldSpace}`);
      socket.join(`space-${nextSpace}`);
      user.spaceLevel = nextSpace;
      
      socket.to(`space-${oldSpace}`).emit('user-left', {
        userId: user.userId,
        socketId: socket.id
      });
      
      socket.to(`space-${nextSpace}`).emit('user-joined', {
        userId: user.userId,
        username: user.username,
        socketId: socket.id
      });
    }
  });

  // Chat message in space
  socket.on('space-chat', (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      io.to(`space-${user.spaceLevel}`).emit('chat-message', {
        userId: user.userId,
        username: user.username,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Battle request to another player
  socket.on('battle-request', (data) => {
    const { targetSocketId } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      io.to(targetSocketId).emit('battle-requested', {
        from: {
          userId: user.userId,
          username: user.username,
          socketId: socket.id
        }
      });
    }
  });

  // Battle response
  socket.on('battle-response', (data) => {
    const { targetSocketId, accepted } = data;
    io.to(targetSocketId).emit('battle-response', {
      fromSocketId: socket.id,
      accepted
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(`space-${user.spaceLevel}`).emit('user-left', {
        userId: user.userId,
        socketId: socket.id
      });
    }
    connectedUsers.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', onlineUsers: connectedUsers.size });
});

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use on ${HOST}.`);
  } else if (error.code === 'EPERM' || error.code === 'EACCES') {
    console.error(`Permission denied while binding server to ${HOST}:${PORT}.`);
  } else {
    console.error('Server startup error:', error);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Shoorveer Game Server running on ${HOST}:${PORT}`);
  console.log('📡 WebSocket server ready');
});
