const express = require('express');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const BOSS_COOLDOWN_MINUTES = 20;
const FIRST_CLEAR_BONUS_POINTS = 1500;
const FIRST_CLEAR_BONUS_CRYSTALS = 25;
const LAST_WEEK_REWARD_BY_RANK = {
  1: { points: 5000, crystals: 120, title: 'Champion' },
  2: { points: 3000, crystals: 80, title: 'Runner-up' },
  3: { points: 1800, crystals: 50, title: 'Elite Contender' }
};

async function getMaxSpaceLevel() {
  const maxSpace = await prisma.space.aggregate({
    _max: { level: true }
  });
  return maxSpace._max.level || 1;
}

function calculateLevelProgression({ currentExperience, experienceGain }) {
  const newExperience = currentExperience + experienceGain;
  const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
  const newPower = 100 + (newLevel - 1) * 20;
  const newMaxHealth = 100 + (newLevel - 1) * 15;
  return { newExperience, newLevel, newPower, newMaxHealth };
}

function getBossCooldownStatus(lastBattleAt) {
  if (!lastBattleAt) {
    return { isOnCooldown: false, remainingSeconds: 0, nextAvailableAt: null };
  }

  const cooldownMs = BOSS_COOLDOWN_MINUTES * 60 * 1000;
  const nextAvailableMs = new Date(lastBattleAt).getTime() + cooldownMs;
  const nowMs = Date.now();
  const remainingMs = nextAvailableMs - nowMs;

  if (remainingMs <= 0) {
    return { isOnCooldown: false, remainingSeconds: 0, nextAvailableAt: null };
  }

  return {
    isOnCooldown: true,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    nextAvailableAt: new Date(nextAvailableMs)
  };
}

function getWeekStartUtc(date = new Date()) {
  const current = new Date(date);
  const utcDay = current.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() - daysSinceMonday,
    0, 0, 0, 0
  ));
  return monday;
}

function getSeasonWindow(season) {
  const thisWeekStart = getWeekStartUtc();
  if (season === 'week') {
    return { start: thisWeekStart, end: null };
  }
  if (season === 'last_week') {
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: lastWeekStart, end: thisWeekStart };
  }
  return { start: null, end: null };
}

function getAdminUsernames() {
  return (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((username) => username.trim())
    .filter(Boolean);
}

function isAdminUser(user) {
  const admins = getAdminUsernames();
  return admins.includes(user.username);
}

async function buildBossLeaderboardForSeason(season) {
  const seasonWindow = getSeasonWindow(season);
  const bossWins = await prisma.battle.findMany({
    where: {
      battleType: 'pve_boss',
      winnerId: { not: null },
      ...(seasonWindow.start
        ? {
            createdAt: {
              gte: seasonWindow.start,
              ...(seasonWindow.end ? { lt: seasonWindow.end } : {})
            }
          }
        : {})
    },
    select: {
      attackerId: true,
      winnerId: true,
      spaceLevel: true,
      rounds: true,
      pointsEarned: true,
      createdAt: true
    }
  });

  const userStatsMap = new Map();

  for (const battle of bossWins) {
    if (battle.winnerId !== battle.attackerId) continue;

    if (!userStatsMap.has(battle.attackerId)) {
      userStatsMap.set(battle.attackerId, {
        userId: battle.attackerId,
        totalBossClears: 0,
        totalBossPoints: 0,
        fastestClearRounds: Number.POSITIVE_INFINITY,
        firstClearBySpace: new Map()
      });
    }

    const stats = userStatsMap.get(battle.attackerId);
    stats.totalBossClears += 1;
    stats.totalBossPoints += battle.pointsEarned || 0;
    stats.fastestClearRounds = Math.min(stats.fastestClearRounds, battle.rounds || Number.POSITIVE_INFINITY);

    const prevFirstClear = stats.firstClearBySpace.get(battle.spaceLevel);
    if (!prevFirstClear || new Date(battle.createdAt) < new Date(prevFirstClear)) {
      stats.firstClearBySpace.set(battle.spaceLevel, battle.createdAt);
    }
  }

  const userIds = Array.from(userStatsMap.keys());
  if (userIds.length === 0) {
    return { seasonWindow, bossLeaderboard: [] };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      displayName: true,
      level: true,
      power: true,
      spaceLevel: true
    }
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  const bossLeaderboard = Array.from(userStatsMap.values())
    .map((stats) => {
      const user = userById.get(stats.userId);
      if (!user) return null;

      const firstClearTimestamps = Array.from(stats.firstClearBySpace.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([spaceLevel, firstClearAt]) => ({
          spaceLevel,
          firstClearAt
        }));

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
        power: user.power,
        spaceLevel: user.spaceLevel,
        totalBossClears: stats.totalBossClears,
        totalBossPoints: stats.totalBossPoints,
        fastestClearRounds: Number.isFinite(stats.fastestClearRounds) ? stats.fastestClearRounds : null,
        firstClearTimestamps
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.totalBossClears !== a.totalBossClears) return b.totalBossClears - a.totalBossClears;
      if (b.totalBossPoints !== a.totalBossPoints) return b.totalBossPoints - a.totalBossPoints;
      if ((a.fastestClearRounds ?? Number.POSITIVE_INFINITY) !== (b.fastestClearRounds ?? Number.POSITIVE_INFINITY)) {
        return (a.fastestClearRounds ?? Number.POSITIVE_INFINITY) - (b.fastestClearRounds ?? Number.POSITIVE_INFINITY);
      }
      return (b.level || 0) - (a.level || 0);
    })
    .slice(0, 50);

  return { seasonWindow, bossLeaderboard };
}

async function archiveLastWeekRewards({ dryRun = false } = {}) {
  const season = 'last_week';
  const { seasonWindow, bossLeaderboard } = await buildBossLeaderboardForSeason(season);
  const seasonRewards = [];

  const rewardCandidates = bossLeaderboard.slice(0, 3);
  for (let index = 0; index < rewardCandidates.length; index++) {
    const rank = index + 1;
    const rewardConfig = LAST_WEEK_REWARD_BY_RANK[rank];
    if (!rewardConfig) continue;

    const winner = rewardCandidates[index];
    const archiveMarker = `season:last_week:${seasonWindow.start.toISOString()}:rank:${rank}`;
    const existingArchive = await prisma.battle.findFirst({
      where: {
        battleType: 'season_reward',
        attackerId: winner.userId,
        defenderId: archiveMarker
      },
      select: { id: true }
    });

    const alreadyArchived = !!existingArchive;

    if (!alreadyArchived && !dryRun) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: winner.userId },
          data: {
            points: { increment: rewardConfig.points },
            crystals: { increment: rewardConfig.crystals }
          }
        }),
        prisma.battle.create({
          data: {
            attackerId: winner.userId,
            defenderId: archiveMarker,
            spaceLevel: winner.spaceLevel || 1,
            winnerId: winner.userId,
            battleType: 'season_reward',
            attackerPower: 0,
            defenderPower: 0,
            attackerHealth: 0,
            defenderHealth: 0,
            rounds: 0,
            log: JSON.stringify({
              season: 'last_week',
              weekStart: seasonWindow.start,
              weekEnd: seasonWindow.end,
              rank,
              title: rewardConfig.title,
              rewardPoints: rewardConfig.points,
              rewardCrystals: rewardConfig.crystals
            }),
            pointsEarned: rewardConfig.points,
            rewardType: 'seasonal_reward',
            rewardAmount: rewardConfig.points,
            status: 'completed',
            endedAt: new Date()
          }
        })
      ]);
    }

    seasonRewards.push({
      userId: winner.userId,
      username: winner.username,
      rank,
      title: rewardConfig.title,
      points: rewardConfig.points,
      crystals: rewardConfig.crystals,
      archived: alreadyArchived || !dryRun
    });
  }

  return {
    season,
    windowStart: seasonWindow.start,
    windowEnd: seasonWindow.end,
    bossLeaderboard,
    seasonRewards
  };
}

// Get all spaces
router.get('/spaces', authMiddleware, async (req, res) => {
  try {
    const spaces = await prisma.space.findMany({
      orderBy: { level: 'asc' }
    });

    const user = req.user;

    // Mark which spaces are unlocked for the user
    const spacesWithStatus = spaces.map(space => {
      const unlocked = user.spaceLevel >= space.level;
      const canEnter = user.power >= space.minPower && user.level >= space.minLevel;
      const missingPower = Math.max(0, space.minPower - user.power);
      const missingLevel = Math.max(0, space.minLevel - user.level);

      return {
        ...space,
        unlocked,
        canEnter,
        missingPower,
        missingLevel
      };
    });

    res.json({ spaces: spacesWithStatus });
  } catch (error) {
    console.error('Get spaces error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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

// Get world progression summary
router.get('/world-summary', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const spaces = await prisma.space.findMany({ orderBy: { level: 'asc' } });
    const highestUnlocked = spaces.filter((space) => user.spaceLevel >= space.level).length;
    const totalSpaces = spaces.length;
    const nextSpace = spaces.find((space) => space.level > user.spaceLevel) || null;

    res.json({
      summary: {
        totalSpaces,
        unlockedSpaces: highestUnlocked,
        completionPercent: totalSpaces > 0 ? Math.round((highestUnlocked / totalSpaces) * 100) : 0,
        nextSpace: nextSpace ? {
          level: nextSpace.level,
          name: nextSpace.name,
          minPower: nextSpace.minPower,
          minLevel: nextSpace.minLevel
        } : null
      }
    });
  } catch (error) {
    console.error('World summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get species in a space
router.get('/spaces/:level/species', authMiddleware, async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const user = req.user;

    if (user.spaceLevel < level) {
      return res.status(403).json({ message: 'Space not unlocked yet' });
    }

    const species = await prisma.species.findMany({
      where: { spaceLevel: level }
    });

    res.json({ species });
  } catch (error) {
    console.error('Get species error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get boss details for a space
router.get('/spaces/:level/boss', authMiddleware, async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const user = req.user;

    if (user.spaceLevel < level) {
      return res.status(403).json({ message: 'Space not unlocked yet' });
    }

    const baseBoss = await prisma.species.findFirst({
      where: { spaceLevel: level },
      orderBy: [{ power: 'desc' }, { health: 'desc' }]
    });

    if (!baseBoss) {
      return res.status(404).json({ message: 'No boss available for this space yet' });
    }

    const bossPower = Math.floor(baseBoss.power * 1.4);
    const bossHealth = Math.floor(baseBoss.health * 1.5);
    const bossRewardPoints = Math.floor(baseBoss.rewardPoints * 2.5);
    const bossRewardCrystals = Math.max(1, Math.floor(baseBoss.rewardCrystals * 2));
    const lastBossBattle = await prisma.battle.findFirst({
      where: {
        attackerId: user.id,
        spaceLevel: level,
        battleType: 'pve_boss'
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });
    const firstClear = await prisma.battle.findFirst({
      where: {
        attackerId: user.id,
        winnerId: user.id,
        spaceLevel: level,
        battleType: 'pve_boss'
      },
      select: { id: true }
    });
    const cooldown = getBossCooldownStatus(lastBossBattle?.createdAt || null);

    res.json({
      boss: {
        id: baseBoss.id,
        name: `${baseBoss.name} Prime`,
        spaceLevel: baseBoss.spaceLevel,
        power: bossPower,
        health: bossHealth,
        rarity: 'boss',
        rewardPoints: bossRewardPoints,
        rewardCrystals: bossRewardCrystals,
        cooldownMinutes: BOSS_COOLDOWN_MINUTES,
        cooldown: {
          isOnCooldown: cooldown.isOnCooldown,
          remainingSeconds: cooldown.remainingSeconds,
          nextAvailableAt: cooldown.nextAvailableAt
        },
        firstClearBonus: {
          available: !firstClear,
          points: FIRST_CLEAR_BONUS_POINTS,
          crystals: FIRST_CLEAR_BONUS_CRYSTALS
        }
      }
    });
  } catch (error) {
    console.error('Get boss error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get NPC warriors in a space
router.get('/spaces/:level/npcs', authMiddleware, async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const user = req.user;

    if (user.spaceLevel < level) {
      return res.status(403).json({ message: 'Space not unlocked yet' });
    }

    const npcs = await prisma.user.findMany({
      where: {
        isNpc: true,
        spaceLevel: level
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        level: true,
        power: true,
        health: true,
        maxHealth: true,
        wins: true,
        losses: true,
        spaceLevel: true,
      }
    });

    res.json({ npcs });
  } catch (error) {
    console.error('Get NPCs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get players in a space
router.get('/spaces/:level/players', authMiddleware, async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    const user = req.user;

    if (user.spaceLevel < level) {
      return res.status(403).json({ message: 'Space not unlocked yet' });
    }

    // Get online players in this space (simulated - in production would use Redis/cache)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const players = await prisma.user.findMany({
      where: {
        isNpc: false,
        spaceLevel: level,
        lastLogin: { gte: fiveMinutesAgo },
        id: { not: user.id }
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        level: true,
        power: true,
        health: true,
        wins: true,
        losses: true,
      },
      take: 20,
      orderBy: { lastLogin: 'desc' }
    });

    // Get NPCs in this space
    const npcs = await prisma.user.findMany({
      where: {
        isNpc: true,
        spaceLevel: level
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        level: true,
        power: true,
        health: true,
        maxHealth: true,
        wins: true,
        losses: true,
      }
    });

    res.json({ players, npcs });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Battle with species
router.post('/battle/species', authMiddleware, async (req, res) => {
  try {
    const { speciesId } = req.body;
    const user = req.user;

    if (!speciesId) {
      return res.status(400).json({ message: 'Species ID required' });
    }

    const species = await prisma.species.findUnique({
      where: { id: speciesId }
    });

    if (!species) {
      return res.status(404).json({ message: 'Species not found' });
    }

    if (user.spaceLevel < species.spaceLevel) {
      return res.status(403).json({ message: 'Space not unlocked' });
    }

    // Get user's total power with items
    const inventory = await prisma.inventoryItem.findMany({
      where: { userId: user.id }
    });

    let totalPower = user.power;
    let totalHealth = user.health;

    inventory.forEach(item => {
      totalPower += item.powerBonus * item.quantity;
      totalHealth += item.healthBonus * item.quantity;
    });

    // Simulate battle
    const battleLog = [];
    let attackerHealth = totalHealth;
    let defenderHealth = species.health;
    let round = 0;

    while (attackerHealth > 0 && defenderHealth > 0 && round < 50) {
      round++;

      // Attacker attacks
      const attackerDamage = Math.floor(totalPower * (0.8 + Math.random() * 0.4));
      defenderHealth -= attackerDamage;
      battleLog.push({
        round,
        actor: 'player',
        action: 'attack',
        damage: attackerDamage,
        defenderHealth: Math.max(0, defenderHealth),
        attackerHealth
      });

      if (defenderHealth <= 0) break;

      // Defender attacks
      const defenderDamage = Math.floor(species.power * (0.8 + Math.random() * 0.4));
      attackerHealth -= defenderDamage;
      battleLog.push({
        round,
        actor: 'species',
        action: 'attack',
        damage: defenderDamage,
        attackerHealth: Math.max(0, attackerHealth),
        defenderHealth
      });
    }

    const playerWon = defenderHealth <= 0;

    // Calculate rewards
    const space = await prisma.space.findUnique({
      where: { level: species.spaceLevel }
    });

    const multiplier = space?.rewardMultiplier || 1;
    const pointsEarned = playerWon
      ? Math.floor(species.rewardPoints * multiplier * (0.9 + Math.random() * 0.2))
      : Math.floor(species.rewardPoints * multiplier * 0.1);
    const crystalsEarned = playerWon ? species.rewardCrystals : 0;

    // Update user stats
    const experienceGain = playerWon ? pointsEarned * 2 : pointsEarned;
    const progression = calculateLevelProgression({
      currentExperience: user.experience,
      experienceGain
    });
    const { newExperience, newLevel, newPower, newMaxHealth } = progression;

    // Check for level up
    const maxSpaceLevel = await getMaxSpaceLevel();
    const unlockedSpaceLevel = newLevel >= (user.spaceLevel * 5) ? user.spaceLevel + 1 : user.spaceLevel;
    const spaceLevelUp = Math.min(unlockedSpaceLevel, maxSpaceLevel);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        experience: newExperience,
        level: newLevel,
        power: newPower,
        maxHealth: newMaxHealth,
        health: newMaxHealth,
        points: { increment: pointsEarned },
        crystals: { increment: crystalsEarned },
        spaceLevel: spaceLevelUp,
        wins: playerWon ? { increment: 1 } : undefined,
        losses: !playerWon ? { increment: 1 } : undefined,
      },
      select: {
        id: true,
        username: true,
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

    // Create battle record (without defender FK constraint)
    await prisma.battle.create({
      data: {
        attackerId: user.id,
        defenderId: speciesId,
        spaceLevel: species.spaceLevel,
        winnerId: playerWon ? user.id : null,
        battleType: 'pve_species',
        attackerPower: totalPower,
        defenderPower: species.power,
        attackerHealth: totalHealth,
        defenderHealth: species.health,
        rounds: round,
        log: JSON.stringify(battleLog),
        pointsEarned,
        rewardType: crystalsEarned > 0 ? 'points_and_crystals' : 'points',
        rewardAmount: pointsEarned,
        status: 'completed',
        endedAt: new Date()
      }
    });

    // Possible item drop
    let itemDrop = null;
    if (playerWon && Math.random() < 0.3) {
      const rarities = ['common', 'common', 'common', 'rare', 'rare', 'epic'];
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      const items = {
        common: [
          { name: 'Iron Sword', type: 'weapon', power: 15, health: 0 },
          { name: 'Wooden Shield', type: 'armor', power: 0, health: 30 },
          { name: 'Energy Drink', type: 'potion', power: 5, health: 20 },
        ],
        rare: [
          { name: 'Crystal Blade', type: 'weapon', power: 35, health: 0 },
          { name: 'Star Plate', type: 'armor', power: 0, health: 60 },
          { name: 'Void Essence', type: 'potion', power: 10, health: 50 },
        ],
        epic: [
          { name: 'Dragon Slayer', type: 'weapon', power: 60, health: 0 },
          { name: 'Cosmic Armor', type: 'armor', power: 10, health: 100 },
          { name: 'Phoenix Feather', type: 'artifact', power: 30, health: 50 },
        ]
      };

      const item = items[rarity][Math.floor(Math.random() * items[rarity].length)];

      itemDrop = await prisma.inventoryItem.create({
        data: {
          userId: user.id,
          itemName: item.name,
          itemType: item.type,
          rarity,
          powerBonus: item.power,
          healthBonus: item.health,
          quantity: 1
        }
      });
    }

    res.json({
      result: playerWon ? 'victory' : 'defeat',
      battleLog,
      rounds: round,
      rewards: {
        points: pointsEarned,
        crystals: crystalsEarned,
        experience: experienceGain,
        itemDrop
      },
      user: updatedUser,
      leveledUp: newLevel > user.level
    });
  } catch (error) {
    console.error('Battle species error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Battle boss in a space
router.post('/battle/boss', authMiddleware, async (req, res) => {
  try {
    const { spaceLevel } = req.body;
    const user = req.user;

    if (!spaceLevel || !Number.isInteger(spaceLevel) || spaceLevel <= 0) {
      return res.status(400).json({ message: 'Valid space level required' });
    }

    if (user.spaceLevel < spaceLevel) {
      return res.status(403).json({ message: 'Space not unlocked' });
    }

    const baseBoss = await prisma.species.findFirst({
      where: { spaceLevel },
      orderBy: [{ power: 'desc' }, { health: 'desc' }]
    });

    if (!baseBoss) {
      return res.status(404).json({ message: 'No boss available for this space yet' });
    }

    const lastBossBattle = await prisma.battle.findFirst({
      where: {
        attackerId: user.id,
        spaceLevel,
        battleType: 'pve_boss'
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });
    const cooldown = getBossCooldownStatus(lastBossBattle?.createdAt || null);
    if (cooldown.isOnCooldown) {
      return res.status(429).json({
        message: 'Boss is recovering. Please wait before re-challenging.',
        cooldown: {
          remainingSeconds: cooldown.remainingSeconds,
          nextAvailableAt: cooldown.nextAvailableAt,
          cooldownMinutes: BOSS_COOLDOWN_MINUTES
        }
      });
    }

    const inventory = await prisma.inventoryItem.findMany({
      where: { userId: user.id }
    });

    let totalPower = user.power;
    let totalHealth = user.health;
    inventory.forEach(item => {
      totalPower += item.powerBonus * item.quantity;
      totalHealth += item.healthBonus * item.quantity;
    });

    const bossName = `${baseBoss.name} Prime`;
    const bossPower = Math.floor(baseBoss.power * 1.4);
    const bossHealth = Math.floor(baseBoss.health * 1.5);

    const battleLog = [];
    let attackerHealth = totalHealth;
    let defenderHealth = bossHealth;
    let round = 0;

    while (attackerHealth > 0 && defenderHealth > 0 && round < 60) {
      round++;

      const attackerDamage = Math.floor(totalPower * (0.75 + Math.random() * 0.35));
      defenderHealth -= attackerDamage;
      battleLog.push({
        round,
        actor: 'player',
        action: 'attack',
        damage: attackerDamage,
        defenderHealth: Math.max(0, defenderHealth),
        attackerHealth
      });

      if (defenderHealth <= 0) break;

      const defenderDamage = Math.floor(bossPower * (0.85 + Math.random() * 0.35));
      attackerHealth -= defenderDamage;
      battleLog.push({
        round,
        actor: 'boss',
        action: 'attack',
        damage: defenderDamage,
        attackerHealth: Math.max(0, attackerHealth),
        defenderHealth
      });
    }

    const playerWon = defenderHealth <= 0;

    const space = await prisma.space.findUnique({ where: { level: spaceLevel } });
    const multiplier = space?.rewardMultiplier || 1;
    const pointsEarnedBase = playerWon
      ? Math.floor(baseBoss.rewardPoints * multiplier * 2.5 * (0.95 + Math.random() * 0.2))
      : Math.floor(baseBoss.rewardPoints * multiplier * 0.2);
    const crystalsEarnedBase = playerWon ? Math.max(1, Math.floor(baseBoss.rewardCrystals * 2.2)) : 0;
    const alreadyClearedBefore = await prisma.battle.findFirst({
      where: {
        attackerId: user.id,
        winnerId: user.id,
        spaceLevel,
        battleType: 'pve_boss'
      },
      select: { id: true }
    });
    const firstClearApplied = playerWon && !alreadyClearedBefore;
    const pointsEarned = firstClearApplied ? pointsEarnedBase + FIRST_CLEAR_BONUS_POINTS : pointsEarnedBase;
    const crystalsEarned = firstClearApplied ? crystalsEarnedBase + FIRST_CLEAR_BONUS_CRYSTALS : crystalsEarnedBase;
    const experienceGain = playerWon ? pointsEarned * 3 : pointsEarned;

    const progression = calculateLevelProgression({
      currentExperience: user.experience,
      experienceGain
    });
    const { newExperience, newLevel, newPower, newMaxHealth } = progression;
    const maxSpaceLevel = await getMaxSpaceLevel();
    const unlockedSpaceLevel = newLevel >= (user.spaceLevel * 5) ? user.spaceLevel + 1 : user.spaceLevel;
    const spaceLevelUp = Math.min(unlockedSpaceLevel, maxSpaceLevel);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        experience: newExperience,
        level: newLevel,
        power: newPower,
        maxHealth: newMaxHealth,
        health: newMaxHealth,
        points: { increment: pointsEarned },
        crystals: { increment: crystalsEarned },
        spaceLevel: spaceLevelUp,
        wins: playerWon ? { increment: 1 } : undefined,
        losses: !playerWon ? { increment: 1 } : undefined
      },
      select: {
        id: true, username: true, level: true, power: true, health: true,
        maxHealth: true, points: true, crystals: true, spaceLevel: true,
        wins: true, losses: true, experience: true
      }
    });

    await prisma.battle.create({
      data: {
        attackerId: user.id,
        defenderId: baseBoss.id,
        spaceLevel,
        winnerId: playerWon ? user.id : null,
        battleType: 'pve_boss',
        attackerPower: totalPower,
        defenderPower: bossPower,
        attackerHealth: totalHealth,
        defenderHealth: bossHealth,
        rounds: round,
        log: JSON.stringify(battleLog),
        pointsEarned,
        rewardType: crystalsEarned > 0 ? 'points_and_crystals' : 'points',
        rewardAmount: pointsEarned,
        status: 'completed',
        endedAt: new Date()
      }
    });

    let itemDrop = null;
    if (playerWon) {
      const rarity = Math.random() < 0.7 ? 'epic' : 'legendary';
      const item = rarity === 'legendary'
        ? { name: `${bossName} Core`, type: 'artifact', power: 120 + spaceLevel * 25, health: 150 + spaceLevel * 20 }
        : { name: `${bossName} Sigil`, type: 'artifact', power: 70 + spaceLevel * 18, health: 90 + spaceLevel * 15 };

      itemDrop = await prisma.inventoryItem.create({
        data: {
          userId: user.id,
          itemName: item.name,
          itemType: item.type,
          rarity,
          powerBonus: item.power,
          healthBonus: item.health,
          quantity: 1
        }
      });
    }

    res.json({
      mode: 'boss',
      opponent: bossName,
      result: playerWon ? 'victory' : 'defeat',
      battleLog,
      rounds: round,
      rewards: {
        points: pointsEarned,
        crystals: crystalsEarned,
        experience: experienceGain,
        itemDrop,
        firstClearBonus: firstClearApplied
          ? { points: FIRST_CLEAR_BONUS_POINTS, crystals: FIRST_CLEAR_BONUS_CRYSTALS }
          : null
      },
      user: updatedUser,
      leveledUp: newLevel > user.level
    });
  } catch (error) {
    console.error('Battle boss error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Battle with NPC
router.post('/battle/npc', authMiddleware, async (req, res) => {
  try {
    const { npcId } = req.body;
    const user = req.user;

    if (!npcId) {
      return res.status(400).json({ message: 'NPC ID required' });
    }

    const npc = await prisma.user.findFirst({
      where: { id: npcId, isNpc: true },
      include: { inventory: true }
    });

    if (!npc) {
      return res.status(404).json({ message: 'NPC not found' });
    }

    if (user.spaceLevel < npc.spaceLevel) {
      return res.status(403).json({ message: 'Space not unlocked' });
    }

    // Get user's total power with items
    const userInventory = await prisma.inventoryItem.findMany({
      where: { userId: user.id }
    });

    let playerPower = user.power;
    let playerHealth = user.health;
    userInventory.forEach(item => {
      playerPower += item.powerBonus * item.quantity;
      playerHealth += item.healthBonus * item.quantity;
    });

    // Calculate NPC total stats
    let npcPower = npc.power;
    let npcHealth = npc.health;
    npc.inventory.forEach(item => {
      npcPower += item.powerBonus * item.quantity;
      npcHealth += item.healthBonus * item.quantity;
    });

    // Simulate battle
    const battleLog = [];
    let attackerHealth = playerHealth;
    let defenderHealth = npcHealth;
    let round = 0;

    while (attackerHealth > 0 && defenderHealth > 0 && round < 50) {
      round++;

      // Player attacks
      const attackerDamage = Math.floor(playerPower * (0.8 + Math.random() * 0.4));
      defenderHealth -= attackerDamage;
      battleLog.push({
        round,
        actor: 'player',
        action: 'attack',
        damage: attackerDamage,
        defenderHealth: Math.max(0, defenderHealth),
        attackerHealth
      });

      if (defenderHealth <= 0) break;

      // NPC attacks
      const defenderDamage = Math.floor(npcPower * (0.8 + Math.random() * 0.4));
      attackerHealth -= defenderDamage;
      battleLog.push({
        round,
        actor: 'npc',
        action: 'attack',
        damage: defenderDamage,
        attackerHealth: Math.max(0, attackerHealth),
        defenderHealth
      });
    }

    const playerWon = defenderHealth <= 0;

    // Calculate rewards based on NPC strength
    const baseReward = npc.level * 20;
    const space = await prisma.space.findUnique({
      where: { level: npc.spaceLevel }
    });
    const multiplier = space?.rewardMultiplier || 1;
    const pointsEarned = playerWon
      ? Math.floor(baseReward * multiplier * (0.9 + Math.random() * 0.2))
      : Math.floor(baseReward * multiplier * 0.1);
    const crystalsEarned = playerWon ? Math.floor(npc.level / 5) : 0;

    // Update user stats
    const experienceGain = playerWon ? pointsEarned * 2 : pointsEarned;
    const progression = calculateLevelProgression({
      currentExperience: user.experience,
      experienceGain
    });
    const { newExperience, newLevel, newPower, newMaxHealth } = progression;
    const maxSpaceLevel = await getMaxSpaceLevel();
    const unlockedSpaceLevel = newLevel >= (user.spaceLevel * 5) ? user.spaceLevel + 1 : user.spaceLevel;
    const spaceLevelUp = Math.min(unlockedSpaceLevel, maxSpaceLevel);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        experience: newExperience,
        level: newLevel,
        power: newPower,
        maxHealth: newMaxHealth,
        health: newMaxHealth,
        points: { increment: pointsEarned },
        crystals: { increment: crystalsEarned },
        spaceLevel: spaceLevelUp,
        wins: playerWon ? { increment: 1 } : undefined,
        losses: !playerWon ? { increment: 1 } : undefined,
      },
      select: {
        id: true, username: true, level: true, power: true, health: true,
        maxHealth: true, points: true, crystals: true, spaceLevel: true,
        wins: true, losses: true, experience: true,
      }
    });

    // Create battle record
    await prisma.battle.create({
      data: {
        attackerId: user.id,
        defenderId: npc.id,
        spaceLevel: npc.spaceLevel,
        winnerId: playerWon ? user.id : npc.id,
        battleType: 'pve_npc',
        attackerPower: playerPower,
        defenderPower: npcPower,
        attackerHealth: playerHealth,
        defenderHealth: npcHealth,
        rounds: round,
        log: JSON.stringify(battleLog),
        pointsEarned,
        rewardType: crystalsEarned > 0 ? 'points_and_crystals' : 'points',
        rewardAmount: pointsEarned,
        status: 'completed',
        endedAt: new Date()
      }
    });

    // Update NPC stats too
    await prisma.user.update({
      where: { id: npc.id },
      data: {
        wins: !playerWon ? { increment: 1 } : undefined,
        losses: playerWon ? { increment: 1 } : undefined,
      }
    });

    // Possible item drop (higher chance vs NPC)
    let itemDrop = null;
    if (playerWon && Math.random() < 0.4) {
      const rarities = ['common', 'common', 'rare', 'rare', 'epic'];
      const rarity = rarities[Math.floor(Math.random() * rarities.length)];
      const items = {
        common: [
          { name: 'NPC Iron Sword', type: 'weapon', power: 15 + npc.level, health: 0 },
          { name: 'NPC Wooden Shield', type: 'armor', power: 0, health: 30 + npc.level },
        ],
        rare: [
          { name: 'NPC Crystal Blade', type: 'weapon', power: 35 + npc.level, health: 0 },
          { name: 'NPC Star Plate', type: 'armor', power: 0, health: 60 + npc.level },
        ],
        epic: [
          { name: 'NPC Legendary Sword', type: 'weapon', power: 60 + npc.level * 2, health: 0 },
          { name: 'NPC Cosmic Armor', type: 'armor', power: 10, health: 100 + npc.level },
        ]
      };

      const item = items[rarity][Math.floor(Math.random() * items[rarity].length)];

      itemDrop = await prisma.inventoryItem.create({
        data: {
          userId: user.id,
          itemName: item.name,
          itemType: item.type,
          rarity,
          powerBonus: item.power,
          healthBonus: item.health,
          quantity: 1
        }
      });
    }

    res.json({
      result: playerWon ? 'victory' : 'defeat',
      battleLog,
      rounds: round,
      opponent: npc.displayName || npc.username,
      rewards: {
        points: pointsEarned,
        crystals: crystalsEarned,
        experience: experienceGain,
        itemDrop
      },
      user: updatedUser,
      leveledUp: newLevel > user.level
    });
  } catch (error) {
    console.error('Battle NPC error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const topPlayers = await prisma.user.findMany({
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
      take: 50
    });

    res.json({ leaderboard: topPlayers });
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

// Get user profile
router.get('/profile/:username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
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
        createdAt: true,
        isNpc: true,
        inventory: true,
        alliances: {
          include: { alliance: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ profile: user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
