const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        level: true,
        power: true,
        health: true,
        maxHealth: true,
        points: true,
        crystals: true,
        spaceLevel: true,
        wins: true,
        losses: true,
        experience: true,
        className: true,
        skillPoints: true,
        dailyStreak: true,
        lastDailyClaim: true,
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
