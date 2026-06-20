const prisma = require('./prisma');

// ---------------------------------------------------------------------------
// New high-tier spaces (11-15) extending the original 1-10 progression.
// ---------------------------------------------------------------------------
const expansionSpaces = [
  { level: 11, name: 'Space-11: Astral Dominion', description: 'Beyond the Omniverse Core lies a realm ruled by astral sovereigns.', minPower: 35000, minLevel: 90, rewardMultiplier: 13.0, speciesCount: 27 },
  { level: 12, name: 'Space-12: Phantom Expanse', description: 'An endless gulf where reality is a fading echo.', minPower: 48000, minLevel: 105, rewardMultiplier: 15.5, speciesCount: 29 },
  { level: 13, name: 'Space-13: Dread Sovereignty', description: 'The throne-world of fear itself. Only the fearless endure.', minPower: 65000, minLevel: 125, rewardMultiplier: 18.0, speciesCount: 31 },
  { level: 14, name: 'Space-14: Genesis Void', description: 'Where universes are born and unmade in a single breath.', minPower: 88000, minLevel: 150, rewardMultiplier: 21.0, speciesCount: 33 },
  { level: 15, name: 'Space-15: Ascendant Throne', description: 'The final seat of all power. Here, gods are challenged.', minPower: 120000, minLevel: 180, rewardMultiplier: 25.0, speciesCount: 35 },
];

const expansionSpecies = [
  // Space 11
  { name: 'Astral Reaver', spaceLevel: 11, power: 33000, health: 26000, abilities: '{"attack":"astral-rend","defense":"star-veil"}', rewardPoints: 16000, rewardCrystals: 480, rarity: 'mythic' },
  { name: 'Dominion Wraith', spaceLevel: 11, power: 37000, health: 29000, abilities: '{"attack":"soul-drain","defense":"phase-shroud"}', rewardPoints: 18000, rewardCrystals: 540, rarity: 'celestial' },
  // Space 12
  { name: 'Phantom Colossus', spaceLevel: 12, power: 46000, health: 36000, abilities: '{"attack":"void-quake","defense":"echo-plate"}', rewardPoints: 22000, rewardCrystals: 620, rarity: 'mythic' },
  { name: 'Expanse Devourer', spaceLevel: 12, power: 51000, health: 40000, abilities: '{"attack":"consume","defense":"null-field"}', rewardPoints: 25000, rewardCrystals: 700, rarity: 'celestial' },
  // Space 13
  { name: 'Dread Monarch', spaceLevel: 13, power: 62000, health: 48000, abilities: '{"attack":"terror-edge","defense":"dread-aegis"}', rewardPoints: 30000, rewardCrystals: 820, rarity: 'mythic' },
  { name: 'Sovereign Eclipse', spaceLevel: 13, power: 69000, health: 54000, abilities: '{"attack":"eclipse-lance","defense":"shadow-crown"}', rewardPoints: 34000, rewardCrystals: 920, rarity: 'celestial' },
  // Space 14
  { name: 'Genesis Leviathan', spaceLevel: 14, power: 84000, health: 66000, abilities: '{"attack":"big-bang","defense":"cosmic-shell"}', rewardPoints: 42000, rewardCrystals: 1100, rarity: 'celestial' },
  { name: 'Void Progenitor', spaceLevel: 14, power: 92000, health: 72000, abilities: '{"attack":"unmake","defense":"genesis-ward"}', rewardPoints: 47000, rewardCrystals: 1250, rarity: 'celestial' },
  // Space 15
  { name: 'Ascendant God-King', spaceLevel: 15, power: 115000, health: 90000, abilities: '{"attack":"divine-judgment","defense":"throne-barrier"}', rewardPoints: 60000, rewardCrystals: 1600, rarity: 'celestial' },
  { name: 'Throne Eternal', spaceLevel: 15, power: 130000, health: 102000, abilities: '{"attack":"omega-flare","defense":"eternal-genesis"}', rewardPoints: 70000, rewardCrystals: 1900, rarity: 'celestial' },
];

const expansionNpcs = [
  { username: 'npc_astral_warden', displayName: 'Astral Warden', level: 92, power: 34000, health: 27000, maxHealth: 27000, spaceLevel: 11, wins: 1050, losses: 14, email: 'npc27@shoorveer.game', password: 'npc_secret_27' },
  { username: 'npc_dominion_blade', displayName: 'Dominion Blade', level: 96, power: 36500, health: 28500, maxHealth: 28500, spaceLevel: 11, wins: 1120, losses: 11, email: 'npc28@shoorveer.game', password: 'npc_secret_28' },
  { username: 'npc_phantom_seer', displayName: 'Phantom Seer', level: 108, power: 47500, health: 37000, maxHealth: 37000, spaceLevel: 12, wins: 1240, losses: 10, email: 'npc29@shoorveer.game', password: 'npc_secret_29' },
  { username: 'npc_expanse_tyrant', displayName: 'Expanse Tyrant', level: 112, power: 50000, health: 39000, maxHealth: 39000, spaceLevel: 12, wins: 1320, losses: 9, email: 'npc30@shoorveer.game', password: 'npc_secret_30' },
  { username: 'npc_dread_executioner', displayName: 'Dread Executioner', level: 128, power: 64000, health: 49000, maxHealth: 49000, spaceLevel: 13, wins: 1500, losses: 8, email: 'npc31@shoorveer.game', password: 'npc_secret_31' },
  { username: 'npc_eclipse_herald', displayName: 'Eclipse Herald', level: 132, power: 67500, health: 52000, maxHealth: 52000, spaceLevel: 13, wins: 1580, losses: 7, email: 'npc32@shoorveer.game', password: 'npc_secret_32' },
  { username: 'npc_genesis_avatar', displayName: 'Genesis Avatar', level: 154, power: 86000, health: 67000, maxHealth: 67000, spaceLevel: 14, wins: 1800, losses: 6, email: 'npc33@shoorveer.game', password: 'npc_secret_33' },
  { username: 'npc_void_architect', displayName: 'Void Architect', level: 160, power: 90000, health: 70000, maxHealth: 70000, spaceLevel: 14, wins: 1900, losses: 5, email: 'npc34@shoorveer.game', password: 'npc_secret_34' },
  { username: 'npc_ascendant_regent', displayName: 'Ascendant Regent', level: 184, power: 118000, health: 92000, maxHealth: 92000, spaceLevel: 15, wins: 2200, losses: 4, email: 'npc35@shoorveer.game', password: 'npc_secret_35' },
  { username: 'npc_eternal_godslayer', displayName: 'Eternal Godslayer', level: 190, power: 128000, health: 100000, maxHealth: 100000, spaceLevel: 15, wins: 2400, losses: 2, email: 'npc36@shoorveer.game', password: 'npc_secret_36' },
];

const expansionActivities = [
  {
    type: 'riddle', title: 'Astral Paradoxes', description: 'Riddles whispered by astral sovereigns.', difficulty: 'hard', spaceLevel: 11,
    data: JSON.stringify({ questions: [
      { question: 'The more of me you take, the more you leave behind. What am I?', answer: 'footsteps', points: 50, explanation: 'Footsteps are left behind as you take more steps.' },
      { question: 'I am light as a feather, yet the strongest person cannot hold me for more than five minutes. What am I?', answer: 'breath', points: 50, explanation: 'You cannot hold your breath very long.' },
      { question: 'What can travel around the world while staying in a corner?', answer: 'stamp', points: 50, explanation: 'A postage stamp stays in the corner of an envelope.' },
    ], passThreshold: 100 }),
    rewardPoints: 600, rewardCrystals: 22, timeLimit: 150
  },
  {
    type: 'math', title: 'Phantom Equations', description: 'High-order calculations from the Phantom Expanse.', difficulty: 'hard', spaceLevel: 12,
    data: JSON.stringify({ questions: [
      { question: 'What is 15% of 2,400?', answer: '360', points: 50, explanation: '0.15 × 2400 = 360.' },
      { question: 'If a value doubles every step from 250 over 4 steps, what is it? (compute 250 × 2^4)', answer: '4000', points: 50, explanation: '250 × 16 = 4000.' },
      { question: 'What is 13 × 13?', answer: '169', points: 50, explanation: '13 squared is 169.' },
    ], passThreshold: 100 }),
    rewardPoints: 720, rewardCrystals: 26, timeLimit: 150
  },
  {
    type: 'pattern', title: 'Dread Sequences', description: 'Sequences encoded in fear itself.', difficulty: 'hard', spaceLevel: 13,
    data: JSON.stringify({ questions: [
      { question: 'Complete: 1, 3, 7, 15, 31, __', answer: '63', points: 55, explanation: 'Each term doubles then adds 1.' },
      { question: 'Complete: 4, 9, 16, 25, 36, __', answer: '49', points: 55, explanation: 'Perfect squares from 2 upward.' },
      { question: 'Complete: 100, 95, 85, 70, 50, __', answer: '25', points: 55, explanation: 'Subtract 5, 10, 15, 20, 25.' },
    ], passThreshold: 110 }),
    rewardPoints: 860, rewardCrystals: 30, timeLimit: 160
  },
  {
    type: 'physics', title: 'Genesis Gravity Run', description: 'Survive collapsing newborn stars in the Genesis Void.', difficulty: 'hard', spaceLevel: 14,
    data: JSON.stringify({ description: 'Newborn stars warp space violently. Survive the chaos.', gravityStrength: 2.0, planetCount: 10, minScore: 800 }),
    rewardPoints: 1000, rewardCrystals: 36, timeLimit: 170
  },
  {
    type: 'riddle', title: 'Throne Enigmas', description: 'The final trials of the Ascendant Throne.', difficulty: 'hard', spaceLevel: 15,
    data: JSON.stringify({ questions: [
      { question: 'What has many keys but cannot open a single lock?', answer: 'piano', points: 60, explanation: 'A piano has keys but opens no locks.' },
      { question: 'What gets wetter the more it dries?', answer: 'towel', points: 60, explanation: 'A towel gets wetter as it dries things.' },
      { question: 'What has a neck but no head?', answer: 'bottle', points: 60, explanation: 'A bottle has a neck but no head.' },
    ], passThreshold: 120 }),
    rewardPoints: 1400, rewardCrystals: 48, timeLimit: 180
  },
];

// ---------------------------------------------------------------------------
// Shop catalog — gear players can buy with points/crystals and equip.
// ---------------------------------------------------------------------------
const shopItems = [
  // Weapons
  { name: 'Recruit Saber', description: 'A reliable starter blade.', itemType: 'weapon', slot: 'weapon', rarity: 'common', powerBonus: 25, healthBonus: 0, pricePoints: 150, priceCrystals: 0, minLevel: 1 },
  { name: 'Plasma Edge', description: 'Superheated plasma cuts through armor.', itemType: 'weapon', slot: 'weapon', rarity: 'rare', powerBonus: 70, healthBonus: 0, pricePoints: 800, priceCrystals: 3, minLevel: 5 },
  { name: 'Nebula Greatsword', description: 'Forged from collapsed star matter.', itemType: 'weapon', slot: 'weapon', rarity: 'epic', powerBonus: 180, healthBonus: 20, pricePoints: 3000, priceCrystals: 12, minLevel: 12 },
  { name: 'Singularity Lance', description: 'Channels the pull of a black hole.', itemType: 'weapon', slot: 'weapon', rarity: 'legendary', powerBonus: 450, healthBonus: 60, pricePoints: 9000, priceCrystals: 40, minLevel: 25 },
  { name: 'Oblivion Reaver', description: 'A weapon that unmakes its target.', itemType: 'weapon', slot: 'weapon', rarity: 'mythic', powerBonus: 1200, healthBonus: 150, pricePoints: 30000, priceCrystals: 120, minLevel: 50 },
  // Armor
  { name: 'Padded Vest', description: 'Basic protection for new warriors.', itemType: 'armor', slot: 'armor', rarity: 'common', powerBonus: 0, healthBonus: 40, pricePoints: 150, priceCrystals: 0, minLevel: 1 },
  { name: 'Void Plate', description: 'Plating that drinks incoming damage.', itemType: 'armor', slot: 'armor', rarity: 'rare', powerBonus: 10, healthBonus: 110, pricePoints: 800, priceCrystals: 3, minLevel: 5 },
  { name: 'Quantum Aegis', description: 'Phases out of reality to absorb blows.', itemType: 'armor', slot: 'armor', rarity: 'epic', powerBonus: 30, healthBonus: 280, pricePoints: 3000, priceCrystals: 12, minLevel: 12 },
  { name: 'Eternal Bulwark', description: 'Armor said to outlast the universe.', itemType: 'armor', slot: 'armor', rarity: 'legendary', powerBonus: 80, healthBonus: 650, pricePoints: 9000, priceCrystals: 40, minLevel: 25 },
  { name: 'Genesis Carapace', description: 'Living armor reborn after every hit.', itemType: 'armor', slot: 'armor', rarity: 'mythic', powerBonus: 200, healthBonus: 1600, pricePoints: 30000, priceCrystals: 120, minLevel: 50 },
  // Accessories
  { name: 'Focus Charm', description: 'Sharpens the warrior’s strikes.', itemType: 'accessory', slot: 'accessory', rarity: 'common', powerBonus: 15, healthBonus: 15, pricePoints: 200, priceCrystals: 0, minLevel: 2 },
  { name: 'Astral Sigil', description: 'A sigil humming with astral power.', itemType: 'accessory', slot: 'accessory', rarity: 'rare', powerBonus: 45, healthBonus: 45, pricePoints: 1000, priceCrystals: 4, minLevel: 8 },
  { name: 'Chrono Pendant', description: 'Bends time to your advantage.', itemType: 'accessory', slot: 'accessory', rarity: 'epic', powerBonus: 120, healthBonus: 120, pricePoints: 3500, priceCrystals: 15, minLevel: 15 },
  { name: 'Omniverse Core Shard', description: 'A fragment of the Omniverse Core itself.', itemType: 'accessory', slot: 'accessory', rarity: 'legendary', powerBonus: 320, healthBonus: 320, pricePoints: 11000, priceCrystals: 50, minLevel: 30 },
];

// ---------------------------------------------------------------------------
// Skills — 4 classes, tiered trees with prerequisites.
// ---------------------------------------------------------------------------
const skills = [
  // Warrior — raw power
  { key: 'war_strength_1', name: 'Battle Fury', description: '+8% power. The warrior’s rage grows.', className: 'warrior', tier: 1, cost: 1, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.08, requires: null },
  { key: 'war_strength_2', name: 'Berserker', description: '+15% power. Strike harder than ever.', className: 'warrior', tier: 2, cost: 2, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.15, requires: 'war_strength_1' },
  { key: 'war_toughness', name: 'Iron Body', description: '+150 max health.', className: 'warrior', tier: 2, cost: 2, powerBonus: 0, healthBonus: 150, damageMultiplier: 1.0, requires: 'war_strength_1' },
  { key: 'war_warlord', name: 'Warlord', description: '+25% power and +200 health. Master of war.', className: 'warrior', tier: 3, cost: 3, powerBonus: 0, healthBonus: 200, damageMultiplier: 1.25, requires: 'war_strength_2' },
  // Mage — power scaling + bonus flat power
  { key: 'mage_arcane_1', name: 'Arcane Bolt', description: '+10% power from arcane mastery.', className: 'mage', tier: 1, cost: 1, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.10, requires: null },
  { key: 'mage_arcane_2', name: 'Spell Weaving', description: '+20% power. Channel deeper magic.', className: 'mage', tier: 2, cost: 2, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.20, requires: 'mage_arcane_1' },
  { key: 'mage_ward', name: 'Mana Ward', description: '+120 health from a protective ward.', className: 'mage', tier: 2, cost: 2, powerBonus: 0, healthBonus: 120, damageMultiplier: 1.0, requires: 'mage_arcane_1' },
  { key: 'mage_archmage', name: 'Archmage', description: '+35% power. Reality bends to your will.', className: 'mage', tier: 3, cost: 3, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.35, requires: 'mage_arcane_2' },
  // Assassin — power + crit-like multiplier
  { key: 'asn_precision_1', name: 'Precision', description: '+12% power. Hit the weak points.', className: 'assassin', tier: 1, cost: 1, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.12, requires: null },
  { key: 'asn_shadow', name: 'Shadowstep', description: '+18% power and +60 health.', className: 'assassin', tier: 2, cost: 2, powerBonus: 0, healthBonus: 60, damageMultiplier: 1.18, requires: 'asn_precision_1' },
  { key: 'asn_lethal', name: 'Lethality', description: '+22% power. Every strike is deadly.', className: 'assassin', tier: 2, cost: 2, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.22, requires: 'asn_precision_1' },
  { key: 'asn_deathblow', name: 'Deathblow', description: '+30% power. None survive your final strike.', className: 'assassin', tier: 3, cost: 3, powerBonus: 0, healthBonus: 80, damageMultiplier: 1.30, requires: 'asn_lethal' },
  // Guardian — tank, big health + some power
  { key: 'grd_vitality_1', name: 'Vitality', description: '+200 max health.', className: 'guardian', tier: 1, cost: 1, powerBonus: 0, healthBonus: 200, damageMultiplier: 1.0, requires: null },
  { key: 'grd_bulwark', name: 'Bulwark', description: '+400 health and +5% power.', className: 'guardian', tier: 2, cost: 2, powerBonus: 0, healthBonus: 400, damageMultiplier: 1.05, requires: 'grd_vitality_1' },
  { key: 'grd_retaliation', name: 'Retaliation', description: '+12% power. Punish your attackers.', className: 'guardian', tier: 2, cost: 2, powerBonus: 0, healthBonus: 0, damageMultiplier: 1.12, requires: 'grd_vitality_1' },
  { key: 'grd_immortal', name: 'Immortal', description: '+800 health and +10% power. Nearly unkillable.', className: 'guardian', tier: 3, cost: 3, powerBonus: 0, healthBonus: 800, damageMultiplier: 1.10, requires: 'grd_bulwark' },
];

// ---------------------------------------------------------------------------
// Quests — dailies (reset each day), weeklies, and lifetime achievements.
// ---------------------------------------------------------------------------
const quests = [
  // Dailies
  { key: 'daily_win_3', title: 'Daily Conqueror', description: 'Win 3 battles today.', category: 'daily', goalType: 'win_battles', goalCount: 3, rewardPoints: 200, rewardCrystals: 3, rewardXp: 150, rewardSkillPoints: 0, minLevel: 1 },
  { key: 'daily_species_5', title: 'Beast Hunter', description: 'Defeat 5 species today.', category: 'daily', goalType: 'defeat_species', goalCount: 5, rewardPoints: 250, rewardCrystals: 4, rewardXp: 200, rewardSkillPoints: 0, minLevel: 1 },
  { key: 'daily_activity_2', title: 'Sharp Mind', description: 'Complete 2 activities today.', category: 'daily', goalType: 'complete_activities', goalCount: 2, rewardPoints: 180, rewardCrystals: 3, rewardXp: 120, rewardSkillPoints: 0, minLevel: 1 },
  { key: 'daily_boss_1', title: 'Boss Slayer', description: 'Defeat a boss today.', category: 'daily', goalType: 'defeat_boss', goalCount: 1, rewardPoints: 400, rewardCrystals: 6, rewardXp: 300, rewardSkillPoints: 1, minLevel: 3 },
  // Weeklies
  { key: 'weekly_win_25', title: 'Weekly Warlord', description: 'Win 25 battles this week.', category: 'weekly', goalType: 'win_battles', goalCount: 25, rewardPoints: 1500, rewardCrystals: 25, rewardXp: 1200, rewardSkillPoints: 2, minLevel: 1 },
  { key: 'weekly_npc_10', title: 'Rival Crusher', description: 'Defeat 10 NPC warriors this week.', category: 'weekly', goalType: 'defeat_npc', goalCount: 10, rewardPoints: 1200, rewardCrystals: 20, rewardXp: 1000, rewardSkillPoints: 2, minLevel: 1 },
  { key: 'weekly_activity_12', title: 'Grand Scholar', description: 'Complete 12 activities this week.', category: 'weekly', goalType: 'complete_activities', goalCount: 12, rewardPoints: 1000, rewardCrystals: 18, rewardXp: 900, rewardSkillPoints: 1, minLevel: 1 },
  // Achievements (lifetime)
  { key: 'ach_win_10', title: 'First Blood', description: 'Win 10 battles total.', category: 'achievement', goalType: 'win_battles', goalCount: 10, rewardPoints: 300, rewardCrystals: 5, rewardXp: 250, rewardSkillPoints: 1, minLevel: 1 },
  { key: 'ach_win_100', title: 'Veteran', description: 'Win 100 battles total.', category: 'achievement', goalType: 'win_battles', goalCount: 100, rewardPoints: 2000, rewardCrystals: 40, rewardXp: 2000, rewardSkillPoints: 3, minLevel: 1 },
  { key: 'ach_win_500', title: 'Legend', description: 'Win 500 battles total.', category: 'achievement', goalType: 'win_battles', goalCount: 500, rewardPoints: 10000, rewardCrystals: 150, rewardXp: 8000, rewardSkillPoints: 5, minLevel: 1 },
  { key: 'ach_boss_25', title: 'Boss Hunter', description: 'Defeat 25 bosses total.', category: 'achievement', goalType: 'defeat_boss', goalCount: 25, rewardPoints: 5000, rewardCrystals: 80, rewardXp: 4000, rewardSkillPoints: 3, minLevel: 1 },
  { key: 'ach_level_25', title: 'Rising Power', description: 'Reach level 25.', category: 'achievement', goalType: 'reach_level', goalCount: 25, rewardPoints: 1500, rewardCrystals: 25, rewardXp: 0, rewardSkillPoints: 2, minLevel: 1 },
  { key: 'ach_level_75', title: 'Ascendant', description: 'Reach level 75.', category: 'achievement', goalType: 'reach_level', goalCount: 75, rewardPoints: 6000, rewardCrystals: 100, rewardXp: 0, rewardSkillPoints: 4, minLevel: 1 },
  { key: 'ach_activity_50', title: 'Mastermind', description: 'Complete 50 activities total.', category: 'achievement', goalType: 'complete_activities', goalCount: 50, rewardPoints: 3000, rewardCrystals: 50, rewardXp: 2500, rewardSkillPoints: 2, minLevel: 1 },
];

async function seedExpansion() {
  // Spaces
  for (const space of expansionSpaces) {
    await prisma.space.upsert({ where: { level: space.level }, update: space, create: space });
  }
  console.log(`Seeded ${expansionSpaces.length} expansion spaces (11-15)`);

  // Species
  for (const s of expansionSpecies) {
    await prisma.species.upsert({
      where: { name: s.name },
      update: { spaceLevel: s.spaceLevel, power: s.power, health: s.health, abilities: s.abilities, rewardPoints: s.rewardPoints, rewardCrystals: s.rewardCrystals, rarity: s.rarity },
      create: s,
    });
  }
  console.log(`Seeded ${expansionSpecies.length} expansion species`);

  // NPC warriors
  for (const npc of expansionNpcs) {
    await prisma.user.upsert({
      where: { username: npc.username },
      update: { displayName: npc.displayName, level: npc.level, power: npc.power, health: npc.health, maxHealth: npc.maxHealth, spaceLevel: npc.spaceLevel, wins: npc.wins, losses: npc.losses, isNpc: true, lastLogin: new Date() },
      create: { ...npc, isNpc: true, createdAt: new Date(), lastLogin: new Date() },
    });
  }
  console.log(`Seeded ${expansionNpcs.length} expansion NPC warriors`);

  // Activities
  for (const activity of expansionActivities) {
    const existing = await prisma.activity.findFirst({ where: { title: activity.title, spaceLevel: activity.spaceLevel } });
    if (existing) {
      await prisma.activity.update({ where: { id: existing.id }, data: { ...activity, isActive: true } });
    } else {
      await prisma.activity.create({ data: activity });
    }
  }
  console.log(`Seeded ${expansionActivities.length} expansion activities`);

  // Shop items
  for (const item of shopItems) {
    await prisma.shopItem.upsert({ where: { name: item.name }, update: { ...item, isActive: true }, create: item });
  }
  console.log(`Seeded ${shopItems.length} shop items`);

  // Skills
  for (const skill of skills) {
    await prisma.skill.upsert({ where: { key: skill.key }, update: skill, create: skill });
  }
  console.log(`Seeded ${skills.length} skills`);

  // Quests
  for (const quest of quests) {
    await prisma.quest.upsert({ where: { key: quest.key }, update: { ...quest, isActive: true }, create: quest });
  }
  console.log(`Seeded ${quests.length} quests`);
}

module.exports = seedExpansion;

if (require.main === module) {
  seedExpansion()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
