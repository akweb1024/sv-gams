const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');
const { buildBossLeaderboardForSeason, isAdminUser } = require('../utils/leaderboard');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({
      message: 'Admin access required. Set ADMIN_USERNAMES env to allow this action.'
    });
  }
  return next();
}

// Admin status for privileged UI controls
router.get('/admin/status', authMiddleware, async (req, res) => {
  try {
    res.json({
      isAdmin: isAdminUser(req.user),
      username: req.user.username
    });
  } catch (error) {
    console.error('Admin status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin monitoring overview
router.get('/admin/overview', authMiddleware, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        message: 'Admin access required.'
      });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      playerUsers,
      npcUsers,
      onlineRecentUsers,
      totalSpaces,
      totalSpecies,
      activeActivities,
      totalBossBattles,
      bossBattles24h
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isNpc: false } }),
      prisma.user.count({ where: { isNpc: true } }),
      prisma.user.count({ where: { isNpc: false, lastLogin: { gte: fiveMinutesAgo } } }),
      prisma.space.count(),
      prisma.species.count(),
      prisma.activity.count({ where: { isActive: true } }),
      prisma.battle.count({ where: { battleType: 'pve_boss' } }),
      prisma.battle.count({ where: { battleType: 'pve_boss', createdAt: { gte: last24Hours } } })
    ]);

    const { seasonWindow: weekWindow, bossLeaderboard: weekBossLeaderboard } = await buildBossLeaderboardForSeason('week');
    const topWeeklyBoss = weekBossLeaderboard.slice(0, 5).map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      totalBossClears: entry.totalBossClears,
      totalBossPoints: entry.totalBossPoints,
      fastestClearRounds: entry.fastestClearRounds
    }));

    res.json({
      metrics: {
        totalUsers,
        playerUsers,
        npcUsers,
        onlineRecentUsers,
        totalSpaces,
        totalSpecies,
        activeActivities,
        totalBossBattles,
        bossBattles24h
      },
      weeklySeason: {
        windowStart: weekWindow.start,
        windowEnd: weekWindow.end,
        topBossWarriors: topWeeklyBoss
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin user management
router.get('/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const includeNpc = String(req.query.includeNpc ?? 'true').toLowerCase() !== 'false';
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSizeRaw = parseInt(String(req.query.pageSize ?? '25'), 10) || 25;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
    const skip = (page - 1) * pageSize;

    const where = {
      ...(includeNpc ? {} : { isNpc: false }),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          isNpc: true,
          level: true,
          power: true,
          points: true,
          crystals: true,
          spaceLevel: true,
          wins: true,
          losses: true,
          createdAt: true,
          lastLogin: true
        }
      })
    ]);

    res.json({
      page,
      pageSize,
      total,
      users
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { displayName, avatar, isNpc } = req.body || {};

    const data = {};
    if (displayName !== undefined) {
      if (displayName === null) {
        data.displayName = null;
      } else if (typeof displayName === 'string') {
        data.displayName = displayName.trim().slice(0, 64) || null;
      } else {
        return res.status(400).json({ message: 'Invalid displayName' });
      }
    }

    if (avatar !== undefined) {
      if (avatar === null) {
        data.avatar = null;
      } else if (typeof avatar === 'string') {
        data.avatar = avatar.trim().slice(0, 512) || null;
      } else {
        return res.status(400).json({ message: 'Invalid avatar' });
      }
    }

    if (isNpc !== undefined) {
      if (typeof isNpc !== 'boolean') {
        return res.status(400).json({ message: 'Invalid isNpc' });
      }
      data.isNpc = isNpc;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        isNpc: true,
        level: true,
        power: true,
        points: true,
        crystals: true,
        spaceLevel: true,
        wins: true,
        losses: true,
        createdAt: true,
        lastLogin: true
      }
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/users/:id/reset-password', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Admin reset password error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
