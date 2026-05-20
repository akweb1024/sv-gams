const express = require('express');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');
const { getWeekStartUtc, getSeasonWindow, buildBossLeaderboardForSeason, archiveLastWeekRewards, isAdminUser } = require('../utils/leaderboard');

const router = express.Router();

// Get leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '50', 10), 10), 100);
    const skip = (page - 1) * pageSize;

    const [total, topPlayers] = await Promise.all([
      prisma.user.count({ where: { isNpc: false } }),
      prisma.user.findMany({
        where: { isNpc: false },
        select: {
          id: true,
          username: true,
          displayName: true,
          level: true,
          power: true,
          points: true,
          crystals: true,
          spaceLevel: true,
          wins: true,
          losses: true,
        },
        orderBy: [
          { points: 'desc' },
          { level: 'desc' }
        ],
        skip,
        take: pageSize
      })
    ]);

    res.json({
      leaderboard: topPlayers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get global boss leaderboard
router.get('/leaderboard/boss', authMiddleware, async (req, res) => {
  try {
    const season = ['all', 'week', 'last_week'].includes(req.query.season) ? req.query.season : 'all';
    if (season === 'last_week') {
      const archived = await archiveLastWeekRewards();
      return res.json(archived);
    }

    const { seasonWindow, bossLeaderboard } = await buildBossLeaderboardForSeason(season);
    res.json({
      bossLeaderboard,
      season,
      windowStart: seasonWindow.start,
      windowEnd: seasonWindow.end,
      seasonRewards: []
    });
  } catch (error) {
    console.error('Boss leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin only: re-run last week archive and reward payouts
router.post('/leaderboard/boss/archive/rerun', authMiddleware, async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        message: 'Admin access required. Set ADMIN_USERNAMES env to allow this action.'
      });
    }

    const dryRun = req.query.dry_run === 'true' || req.body?.dryRun === true;
    const result = await archiveLastWeekRewards({ dryRun });

    res.json({
      message: dryRun
        ? 'Dry-run complete. No payouts written.'
        : 'Last-week archive rerun complete.',
      ...result
    });
  } catch (error) {
    console.error('Boss archive rerun error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
