const express = require('express');
const authMiddleware = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { getPeriodKey, syncLevelQuests } = require('../utils/progression');
const { calculateLevelProgression, getMaxSpaceLevel, calculateSpaceLevelUp } = require('../utils/battle');

const router = express.Router();

function dayStamp(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : null;
}

// GET /api/quests — active quests for this player with current-period progress
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Keep level-based achievements in sync before reporting.
    await syncLevelQuests(prisma, req.user);

    const quests = await prisma.quest.findMany({
      where: { isActive: true, minLevel: { lte: req.user.level } },
      orderBy: [{ category: 'asc' }, { goalCount: 'asc' }],
    });

    const ids = quests.map((q) => q.id);
    const userQuests = await prisma.userQuest.findMany({
      where: { userId: req.user.id, questId: { in: ids } },
    });

    const byKey = new Map();
    for (const uq of userQuests) byKey.set(`${uq.questId}:${uq.periodKey}`, uq);

    const merged = quests.map((q) => {
      const periodKey = getPeriodKey(q.category);
      const uq = byKey.get(`${q.id}:${periodKey}`);
      return {
        id: q.id,
        key: q.key,
        title: q.title,
        description: q.description,
        category: q.category,
        goalType: q.goalType,
        goalCount: q.goalCount,
        rewards: { points: q.rewardPoints, crystals: q.rewardCrystals, xp: q.rewardXp, skillPoints: q.rewardSkillPoints },
        progress: uq?.progress || 0,
        completed: uq?.completed || false,
        claimed: uq?.claimed || false,
      };
    });

    const today = dayStamp(new Date());
    const dailyClaimedToday = dayStamp(req.user.lastDailyClaim) === today;

    res.json({
      quests: {
        daily: merged.filter((q) => q.category === 'daily'),
        weekly: merged.filter((q) => q.category === 'weekly'),
        achievement: merged.filter((q) => q.category === 'achievement'),
      },
      dailyReward: {
        available: !dailyClaimedToday,
        streak: req.user.dailyStreak || 0,
      },
    });
  } catch (error) {
    console.error('Quests list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/quests/daily-reward/claim — daily login reward with a streak bonus
// NOTE: declared before /:questId/claim so the literal path isn't captured as a questId.
router.post('/daily-reward/claim', authMiddleware, async (req, res) => {
  try {
    const today = dayStamp(new Date());
    const lastClaim = dayStamp(req.user.lastDailyClaim);
    if (lastClaim === today) {
      return res.status(400).json({ message: 'Daily reward already claimed today' });
    }

    // Streak continues if last claim was yesterday, otherwise resets.
    const yesterday = dayStamp(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const newStreak = lastClaim === yesterday ? (req.user.dailyStreak || 0) + 1 : 1;

    const rewardPoints = 100 + newStreak * 25;
    const rewardCrystals = 1 + Math.floor(newStreak / 3);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        points: { increment: rewardPoints },
        crystals: { increment: rewardCrystals },
        lastDailyClaim: new Date(),
        dailyStreak: newStreak,
      },
      select: { points: true, crystals: true, dailyStreak: true },
    });

    res.json({
      message: `Daily reward claimed! Day ${newStreak} streak.`,
      rewards: { points: rewardPoints, crystals: rewardCrystals },
      streak: newStreak,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Daily reward error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/quests/:questId/claim — collect rewards for a completed quest
router.post('/:questId/claim', authMiddleware, async (req, res) => {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.questId } });
    if (!quest) return res.status(404).json({ message: 'Quest not found' });

    const periodKey = getPeriodKey(quest.category);
    const uq = await prisma.userQuest.findUnique({
      where: { userId_questId_periodKey: { userId: req.user.id, questId: quest.id, periodKey } },
    });
    if (!uq || !uq.completed) return res.status(400).json({ message: 'Quest not completed yet' });
    if (uq.claimed) return res.status(400).json({ message: 'Reward already claimed' });

    // Apply XP and recompute level/power if the quest grants experience.
    const progression = calculateLevelProgression({ currentExperience: req.user.experience, experienceGain: quest.rewardXp });
    const maxSpaceLevel = await getMaxSpaceLevel(prisma);
    const spaceLevelUp = calculateSpaceLevelUp(progression.newLevel, req.user.spaceLevel, maxSpaceLevel);
    const levelGain = Math.max(0, progression.newLevel - req.user.level);

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: {
          points: { increment: quest.rewardPoints },
          crystals: { increment: quest.rewardCrystals },
          skillPoints: { increment: quest.rewardSkillPoints + levelGain },
          experience: progression.newExperience,
          level: progression.newLevel,
          power: progression.newPower,
          maxHealth: progression.newMaxHealth,
          health: progression.newMaxHealth,
          spaceLevel: spaceLevelUp,
        },
        select: { points: true, crystals: true, skillPoints: true, level: true, power: true, maxHealth: true, experience: true, spaceLevel: true },
      }),
      prisma.userQuest.update({ where: { id: uq.id }, data: { claimed: true } }),
    ]);

    res.json({
      message: `Claimed: ${quest.title}`,
      rewards: { points: quest.rewardPoints, crystals: quest.rewardCrystals, xp: quest.rewardXp, skillPoints: quest.rewardSkillPoints + levelGain },
      user: updatedUser,
      leveledUp: levelGain > 0,
    });
  } catch (error) {
    console.error('Claim quest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
