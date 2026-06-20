const express = require('express');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');
const { simulateBattle, calculateLevelProgression, getMaxSpaceLevel, calculateSpaceLevelUp, getUserTotalStats } = require('../utils/battle');
const { awardBattleProgress } = require('../utils/progression');

const router = express.Router();
const BOSS_COOLDOWN_MINUTES = 20;
const FIRST_CLEAR_BONUS_POINTS = 1500;
const FIRST_CLEAR_BONUS_CRYSTALS = 25;

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

// Get all spaces
router.get('/spaces', authMiddleware, async (req, res) => {
  try {
    const spaces = await prisma.space.findMany({
      orderBy: { level: 'asc' }
    });

    const user = req.user;

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

    const { totalPower, totalHealth } = await getUserTotalStats(prisma, user.id, user);

    const { attackerWon, battleLog, rounds } = simulateBattle(
      totalPower, species.power, totalHealth, species.health, 50
    );

    const playerWon = attackerWon;

    const space = await prisma.space.findUnique({
      where: { level: species.spaceLevel }
    });

    const multiplier = space?.rewardMultiplier || 1;
    const pointsEarned = playerWon
      ? Math.floor(species.rewardPoints * multiplier * (0.9 + Math.random() * 0.2))
      : Math.floor(species.rewardPoints * multiplier * 0.1);
    const crystalsEarned = playerWon ? species.rewardCrystals : 0;

    const experienceGain = playerWon ? pointsEarned * 2 : pointsEarned;
    const progression = calculateLevelProgression({
      currentExperience: user.experience,
      experienceGain
    });
    const { newExperience, newLevel, newPower, newMaxHealth } = progression;

    const maxSpaceLevel = await getMaxSpaceLevel(prisma);
    const spaceLevelUp = calculateSpaceLevelUp(newLevel, user.spaceLevel, maxSpaceLevel);

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
        rounds,
        log: JSON.stringify(battleLog),
        pointsEarned,
        rewardType: crystalsEarned > 0 ? 'points_and_crystals' : 'points',
        rewardAmount: pointsEarned,
        status: 'completed',
        endedAt: new Date()
      }
    });

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

    await awardBattleProgress(prisma, user.id, { won: playerWon, kind: 'species', oldLevel: user.level, newLevel });

    res.json({
      result: playerWon ? 'victory' : 'defeat',
      battleLog,
      rounds,
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

    const { totalPower, totalHealth } = await getUserTotalStats(prisma, user.id, user);

    const bossName = `${baseBoss.name} Prime`;
    const bossPower = Math.floor(baseBoss.power * 1.4);
    const bossHealth = Math.floor(baseBoss.health * 1.5);

    const { attackerWon, battleLog, rounds } = simulateBattle(
      totalPower, bossPower, totalHealth, bossHealth, 60,
      [0.75, 1.1], [0.85, 1.2]
    );

    const playerWon = attackerWon;

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
    const maxSpaceLevel = await getMaxSpaceLevel(prisma);
    const spaceLevelUp = calculateSpaceLevelUp(newLevel, user.spaceLevel, maxSpaceLevel);

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
        rounds,
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

    await awardBattleProgress(prisma, user.id, { won: playerWon, kind: 'boss', oldLevel: user.level, newLevel });

    res.json({
      mode: 'boss',
      opponent: bossName,
      result: playerWon ? 'victory' : 'defeat',
      battleLog,
      rounds,
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

    const { totalPower: playerPower, totalHealth: playerHealth } = await getUserTotalStats(prisma, user.id, user);

    let npcPower = npc.power;
    let npcHealth = npc.health;
    npc.inventory.forEach(item => {
      npcPower += item.powerBonus * item.quantity;
      npcHealth += item.healthBonus * item.quantity;
    });

    const { attackerWon, battleLog, rounds } = simulateBattle(
      playerPower, npcPower, playerHealth, npcHealth, 50
    );

    const playerWon = attackerWon;

    const baseReward = npc.level * 20;
    const space = await prisma.space.findUnique({
      where: { level: npc.spaceLevel }
    });
    const multiplier = space?.rewardMultiplier || 1;
    const pointsEarned = playerWon
      ? Math.floor(baseReward * multiplier * (0.9 + Math.random() * 0.2))
      : Math.floor(baseReward * multiplier * 0.1);
    const crystalsEarned = playerWon ? Math.floor(npc.level / 5) : 0;

    const experienceGain = playerWon ? pointsEarned * 2 : pointsEarned;
    const progression = calculateLevelProgression({
      currentExperience: user.experience,
      experienceGain
    });
    const { newExperience, newLevel, newPower, newMaxHealth } = progression;
    const maxSpaceLevel = await getMaxSpaceLevel(prisma);
    const spaceLevelUp = calculateSpaceLevelUp(newLevel, user.spaceLevel, maxSpaceLevel);

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
        rounds,
        log: JSON.stringify(battleLog),
        pointsEarned,
        rewardType: crystalsEarned > 0 ? 'points_and_crystals' : 'points',
        rewardAmount: pointsEarned,
        status: 'completed',
        endedAt: new Date()
      }
    });

    await prisma.user.update({
      where: { id: npc.id },
      data: {
        wins: !playerWon ? { increment: 1 } : undefined,
        losses: playerWon ? { increment: 1 } : undefined,
      }
    });

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

    await awardBattleProgress(prisma, user.id, { won: playerWon, kind: 'npc', oldLevel: user.level, newLevel });

    res.json({
      result: playerWon ? 'victory' : 'defeat',
      battleLog,
      rounds,
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
