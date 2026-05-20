const express = require('express');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create alliance
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const user = req.user;
    
    if (!name) {
      return res.status(400).json({ message: 'Alliance name required' });
    }
    
    // Check if user is already in an alliance
    const existingMember = await prisma.allianceMember.findFirst({
      where: { userId: user.id }
    });
    
    if (existingMember) {
      return res.status(400).json({ message: 'You are already in an alliance' });
    }
    
    const alliance = await prisma.alliance.create({
      data: {
        name,
        description,
        leaderId: user.id,
        spaceLevel: user.spaceLevel,
      }
    });
    
    await prisma.allianceMember.create({
      data: {
        allianceId: alliance.id,
        userId: user.id,
        role: 'leader'
      }
    });
    
    res.status(201).json({ message: 'Alliance created', alliance });
  } catch (error) {
    console.error('Create alliance error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Alliance name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all alliances
router.get('/', authMiddleware, async (req, res) => {
  try {
    const alliances = await prisma.alliance.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                level: true,
                power: true
              }
            }
          }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ alliances });
  } catch (error) {
    console.error('Get alliances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join alliance
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const existingMember = await prisma.allianceMember.findFirst({
      where: { userId: user.id }
    });
    
    if (existingMember) {
      return res.status(400).json({ message: 'You are already in an alliance' });
    }
    
    const alliance = await prisma.alliance.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } }
    });
    
    if (!alliance) {
      return res.status(404).json({ message: 'Alliance not found' });
    }
    
    if (alliance._count.members >= alliance.maxMembers) {
      return res.status(400).json({ message: 'Alliance is full' });
    }
    
    await prisma.allianceMember.create({
      data: {
        allianceId: id,
        userId: user.id,
        role: 'member'
      }
    });
    
    res.json({ message: 'Joined alliance successfully' });
  } catch (error) {
    console.error('Join alliance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave alliance
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    const membership = await prisma.allianceMember.findFirst({
      where: { userId: user.id },
      include: { alliance: true }
    });
    
    if (!membership) {
      return res.status(400).json({ message: 'You are not in an alliance' });
    }
    
    // If leader is leaving, transfer leadership or delete alliance
    if (membership.role === 'leader') {
      const otherMembers = await prisma.allianceMember.findMany({
        where: {
          allianceId: membership.allianceId,
          userId: { not: user.id }
        },
        orderBy: { joinedAt: 'asc' },
        take: 1
      });

      if (otherMembers.length > 0) {
        await prisma.$transaction([
          prisma.allianceMember.delete({ where: { id: membership.id } }),
          prisma.allianceMember.update({
            where: { id: otherMembers[0].id },
            data: { role: 'leader' }
          }),
          prisma.alliance.update({
            where: { id: membership.allianceId },
            data: { leaderId: otherMembers[0].userId }
          })
        ]);
        return res.json({ message: 'Leadership transferred to another member' });
      } else {
        await prisma.alliance.delete({
          where: { id: membership.allianceId }
        });
        return res.json({ message: 'Alliance disbanded as leader was the only member' });
      }
    }
    
    await prisma.allianceMember.delete({
      where: { id: membership.id }
    });
    
    res.json({ message: 'Left alliance successfully' });
  } catch (error) {
    console.error('Leave alliance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
