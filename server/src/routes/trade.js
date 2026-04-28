const express = require('express');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create trade offer
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { receiverId, offerType, offerAmount, offerItemId, requestType, requestAmount, requestItemId } = req.body;
    const sender = req.user;
    
    if (!receiverId || !offerType || !requestType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    if (sender.id === receiverId) {
      return res.status(400).json({ message: 'Cannot trade with yourself' });
    }
    
    // Validate sender has enough resources
    if (offerType === 'points' && sender.points < (offerAmount || 0)) {
      return res.status(400).json({ message: 'Insufficient points' });
    }
    if (offerType === 'crystals' && sender.crystals < (offerAmount || 0)) {
      return res.status(400).json({ message: 'Insufficient crystals' });
    }
    if (offerType === 'item' && offerItemId) {
      const item = await prisma.inventoryItem.findFirst({
        where: { id: offerItemId, userId: sender.id }
      });
      if (!item) {
        return res.status(400).json({ message: 'Item not found in inventory' });
      }
    }
    
    const trade = await prisma.trade.create({
      data: {
        senderId: sender.id,
        receiverId,
        offerType,
        offerAmount: offerAmount || 0,
        offerItemId,
        requestType,
        requestAmount: requestAmount || 0,
        requestItemId,
        status: 'pending'
      }
    });
    
    res.status(201).json({ message: 'Trade offer sent', trade });
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my trades
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id }
        ],
        status: 'pending'
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true }
        },
        receiver: {
          select: { id: true, username: true, displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ trades });
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept trade
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const trade = await prisma.trade.findUnique({
      where: { id }
    });
    
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    if (trade.receiverId !== user.id) {
      return res.status(403).json({ message: 'Not authorized to accept this trade' });
    }
    
    if (trade.status !== 'pending') {
      return res.status(400).json({ message: 'Trade is no longer pending' });
    }
    
    // Validate receiver has enough resources
    if (trade.requestType === 'points') {
      if (user.points < trade.requestAmount) {
        return res.status(400).json({ message: 'Insufficient points' });
      }
    }
    if (trade.requestType === 'crystals') {
      if (user.crystals < trade.requestAmount) {
        return res.status(400).json({ message: 'Insufficient crystals' });
      }
    }
    if (trade.requestType === 'item' && trade.requestItemId) {
      const item = await prisma.inventoryItem.findFirst({
        where: { id: trade.requestItemId, userId: user.id }
      });
      if (!item) {
        return res.status(400).json({ message: 'Requested item not found' });
      }
    }
    
    // Execute trade
    await prisma.$transaction(async (tx) => {
      // Transfer offer from sender to receiver
      if (trade.offerType === 'points') {
        await tx.user.update({
          where: { id: trade.senderId },
          data: { points: { decrement: trade.offerAmount } }
        });
        await tx.user.update({
          where: { id: trade.receiverId },
          data: { points: { increment: trade.offerAmount } }
        });
      }
      if (trade.offerType === 'crystals') {
        await tx.user.update({
          where: { id: trade.senderId },
          data: { crystals: { decrement: trade.offerAmount } }
        });
        await tx.user.update({
          where: { id: trade.receiverId },
          data: { crystals: { increment: trade.offerAmount } }
        });
      }
      if (trade.offerType === 'item' && trade.offerItemId) {
        await tx.inventoryItem.update({
          where: { id: trade.offerItemId },
          data: { userId: trade.receiverId }
        });
      }
      
      // Transfer request from receiver to sender
      if (trade.requestType === 'points') {
        await tx.user.update({
          where: { id: trade.receiverId },
          data: { points: { decrement: trade.requestAmount } }
        });
        await tx.user.update({
          where: { id: trade.senderId },
          data: { points: { increment: trade.requestAmount } }
        });
      }
      if (trade.requestType === 'crystals') {
        await tx.user.update({
          where: { id: trade.receiverId },
          data: { crystals: { decrement: trade.requestAmount } }
        });
        await tx.user.update({
          where: { id: trade.senderId },
          data: { crystals: { increment: trade.requestAmount } }
        });
      }
      if (trade.requestType === 'item' && trade.requestItemId) {
        await tx.inventoryItem.update({
          where: { id: trade.requestItemId },
          data: { userId: trade.senderId }
        });
      }
      
      // Update trade status
      await tx.trade.update({
        where: { id },
        data: { status: 'accepted', resolvedAt: new Date() }
      });
    });
    
    res.json({ message: 'Trade accepted successfully' });
  } catch (error) {
    console.error('Accept trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject trade
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const trade = await prisma.trade.findUnique({
      where: { id }
    });
    
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }
    
    if (trade.receiverId !== user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await prisma.trade.update({
      where: { id },
      data: { status: 'rejected', resolvedAt: new Date() }
    });
    
    res.json({ message: 'Trade rejected' });
  } catch (error) {
    console.error('Reject trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
