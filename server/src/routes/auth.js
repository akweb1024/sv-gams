const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
      },
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
      }
    });
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Give starter items
    await prisma.inventoryItem.createMany({
      data: [
        { userId: user.id, itemType: 'weapon', itemName: 'Basic Sword', powerBonus: 10, healthBonus: 0, rarity: 'common', quantity: 1 },
        { userId: user.id, itemType: 'armor', itemName: 'Leather Vest', powerBonus: 0, healthBonus: 20, rarity: 'common', quantity: 1 },
        { userId: user.id, itemType: 'potion', itemName: 'Health Potion', powerBonus: 0, healthBonus: 50, rarity: 'common', quantity: 3 },
      ]
    });
    
    res.status(201).json({ message: 'User created successfully', token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        password: true,
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
      }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ message: 'Login successful', token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    
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
        inventory: true,
        alliances: {
          include: { alliance: true }
        }
      }
    });
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
