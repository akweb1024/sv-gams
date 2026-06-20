// Shared progression helpers: character classes, effective combat stats,
// and quest/achievement progress tracking.

const CLASS_MODIFIERS = {
  warrior:  { label: 'Warrior',  powerMult: 1.10, healthMult: 1.00, description: 'Frontline bruiser. +10% power.' },
  mage:     { label: 'Mage',     powerMult: 1.15, healthMult: 0.95, description: 'Glass cannon. +15% power, slightly less health.' },
  assassin: { label: 'Assassin', powerMult: 1.12, healthMult: 0.98, description: 'Lethal striker. +12% power.' },
  guardian: { label: 'Guardian', powerMult: 1.00, healthMult: 1.30, description: 'Immovable tank. +30% health.' },
};

function getClassModifier(className) {
  return CLASS_MODIFIERS[className] || { powerMult: 1.0, healthMult: 1.0 };
}

// Compute a player's effective combat stats from base stats + equipped gear
// + unlocked skills + chosen class. Returns the numbers fed into simulateBattle.
async function getEffectiveStats(prisma, userId, baseUser) {
  const [equipped, userSkills] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { userId, equipped: true } }),
    prisma.userSkill.findMany({ where: { userId } }),
  ]);

  let gearPower = 0;
  let gearHealth = 0;
  for (const item of equipped) {
    // Each upgrade level adds 10% of the item's base bonuses.
    const mult = 1 + 0.1 * (item.upgradeLevel || 0);
    gearPower += Math.round(item.powerBonus * mult) * item.quantity;
    gearHealth += Math.round(item.healthBonus * mult) * item.quantity;
  }

  let skillPower = 0;
  let skillHealth = 0;
  let damageMult = 1.0;
  if (userSkills.length > 0) {
    const keys = userSkills.map((s) => s.skillKey);
    const skillDefs = await prisma.skill.findMany({ where: { key: { in: keys } } });
    for (const def of skillDefs) {
      skillPower += def.powerBonus;
      skillHealth += def.healthBonus;
      damageMult *= def.damageMultiplier || 1.0;
    }
  }

  const cls = getClassModifier(baseUser.className);

  const rawPower = baseUser.power + gearPower + skillPower;
  const rawHealth = baseUser.health + gearHealth + skillHealth;

  const totalPower = Math.max(1, Math.round(rawPower * cls.powerMult * damageMult));
  const totalHealth = Math.max(1, Math.round(rawHealth * cls.healthMult));

  return {
    totalPower,
    totalHealth,
    breakdown: { base: baseUser.power, gearPower, skillPower, gearHealth, skillHealth, classPowerMult: cls.powerMult, classHealthMult: cls.healthMult, damageMult },
  };
}

// ---------------------------------------------------------------------------
// Quest progress
// ---------------------------------------------------------------------------

function getPeriodKey(category, date = new Date()) {
  if (category === 'achievement') return 'all';
  const d = new Date(date);
  if (category === 'weekly') {
    // Monday (UTC) of the current week, as YYYY-MM-DD.
    const day = d.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday));
    return `W${monday.toISOString().slice(0, 10)}`;
  }
  // daily
  return d.toISOString().slice(0, 10);
}

// Increment progress on all active quests matching a goal type for this user.
// goalType is one of: win_battles, defeat_species, defeat_npc, defeat_boss,
// complete_activities, earn_points.
async function recordQuestProgress(prisma, user, goalType, amount = 1) {
  if (amount <= 0) return;
  const quests = await prisma.quest.findMany({
    where: { goalType, isActive: true, minLevel: { lte: user.level } },
  });
  for (const quest of quests) {
    const periodKey = getPeriodKey(quest.category);
    const existing = await prisma.userQuest.findUnique({
      where: { userId_questId_periodKey: { userId: user.id, questId: quest.id, periodKey } },
    });
    if (!existing) {
      const progress = Math.min(amount, quest.goalCount);
      await prisma.userQuest.create({
        data: { userId: user.id, questId: quest.id, periodKey, progress, completed: progress >= quest.goalCount },
      });
    } else if (!existing.completed) {
      const progress = Math.min(existing.progress + amount, quest.goalCount);
      await prisma.userQuest.update({
        where: { id: existing.id },
        data: { progress, completed: progress >= quest.goalCount },
      });
    }
  }
}

// Sync absolute-value quests (reach_level) — progress equals the current level.
async function syncLevelQuests(prisma, user) {
  const quests = await prisma.quest.findMany({ where: { goalType: 'reach_level', isActive: true } });
  for (const quest of quests) {
    const periodKey = getPeriodKey(quest.category);
    const progress = Math.min(user.level, quest.goalCount);
    const completed = user.level >= quest.goalCount;
    await prisma.userQuest.upsert({
      where: { userId_questId_periodKey: { userId: user.id, questId: quest.id, periodKey } },
      update: { progress, completed },
      create: { userId: user.id, questId: quest.id, periodKey, progress, completed },
    });
  }
}

// Award quest progress + skill points after a battle. Failures are swallowed so
// progression bookkeeping can never break a battle response.
async function awardBattleProgress(prisma, userId, { won, kind, oldLevel, newLevel }) {
  try {
    const levelGain = Math.max(0, (newLevel || 0) - (oldLevel || 0));
    if (levelGain > 0) {
      await prisma.user.update({ where: { id: userId }, data: { skillPoints: { increment: levelGain } } });
    }
    const user = { id: userId, level: newLevel };
    if (won) {
      await recordQuestProgress(prisma, user, 'win_battles', 1);
      if (kind === 'species') await recordQuestProgress(prisma, user, 'defeat_species', 1);
      if (kind === 'npc') await recordQuestProgress(prisma, user, 'defeat_npc', 1);
      if (kind === 'boss') await recordQuestProgress(prisma, user, 'defeat_boss', 1);
    }
    await syncLevelQuests(prisma, user);
    return { skillPointsGained: levelGain };
  } catch (error) {
    console.error('awardBattleProgress error:', error);
    return { skillPointsGained: 0 };
  }
}

async function awardActivityProgress(prisma, userId, { completed, level }) {
  try {
    const user = { id: userId, level };
    if (completed) await recordQuestProgress(prisma, user, 'complete_activities', 1);
    await syncLevelQuests(prisma, user);
  } catch (error) {
    console.error('awardActivityProgress error:', error);
  }
}

module.exports = {
  CLASS_MODIFIERS,
  getClassModifier,
  getEffectiveStats,
  getPeriodKey,
  recordQuestProgress,
  syncLevelQuests,
  awardBattleProgress,
  awardActivityProgress,
};
