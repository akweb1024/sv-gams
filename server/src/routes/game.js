const express = require('express');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all spaces
router.get('/spaces', authMiddleware, async (req, res) => {
  try {
    const spaces = await prisma.space.findMany({
      orderBy: { level: 'asc' }
    });

    const user = req.user;

    // Mark which spaces are unlocked for the user
    const spacesWithStatus = spaces.map(space => ({
      ...space,
      unlocked: user.spaceLevel >= space.level,
      canEnter: user.power >= space.minPower && user.level >= space.minLevel
    }));

    res.json({ spaces: spacesWithStatus });
  } catch (error) {
    console.error('Get spaces error:', error);
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
    const newExperience = user.experience + experienceGain;
    const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
    const newPower = 100 + (newLevel - 1) * 20;
    const newMaxHealth = 100 + (newLevel - 1) * 15;

    // Check for level up
    const spaceLevelUp = newLevel >= (user.spaceLevel * 5) ? user.spaceLevel + 1 : user.spaceLevel;

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

// Battle with NPC
router.post('/battle/npc', authMiddleware, async (req, res) => {
  try {
    const { npcId } = req.body;
    const user = req.user;

    if (!npcId) {
      return res.status(400).json({ message: 'NPC ID required' });
    }

    const npc = await prisma.user.findUnique({
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
    const newExperience = user.experience + experienceGain;
    const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
    const newPower = 100 + (newLevel - 1) * 20;
    const newMaxHealth = 100 + (newLevel - 1) * 15;
    const spaceLevelUp = newLevel >= (user.spaceLevel * 5) ? user.spaceLevel + 1 : user.spaceLevel;

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
