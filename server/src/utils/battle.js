function simulateBattle(attackerPower, defenderPower, attackerHealth, defenderHealth, maxRounds = 50, attackerVariance = [0.8, 1.2], defenderVariance = [0.8, 1.2]) {
  const battleLog = [];
  let currentAttackerHealth = attackerHealth;
  let currentDefenderHealth = defenderHealth;
  let round = 0;

  while (currentAttackerHealth > 0 && currentDefenderHealth > 0 && round < maxRounds) {
    round++;

    const attackerDamage = Math.floor(attackerPower * (attackerVariance[0] + Math.random() * (attackerVariance[1] - attackerVariance[0])));
    currentDefenderHealth -= attackerDamage;
    battleLog.push({
      round,
      actor: 'attacker',
      action: 'attack',
      damage: attackerDamage,
      defenderHealth: Math.max(0, currentDefenderHealth),
      attackerHealth: currentAttackerHealth
    });

    if (currentDefenderHealth <= 0) break;

    const defenderDamage = Math.floor(defenderPower * (defenderVariance[0] + Math.random() * (defenderVariance[1] - defenderVariance[0])));
    currentAttackerHealth -= defenderDamage;
    battleLog.push({
      round,
      actor: 'defender',
      action: 'attack',
      damage: defenderDamage,
      attackerHealth: Math.max(0, currentAttackerHealth),
      defenderHealth: currentDefenderHealth
    });
  }

  const attackerWon = currentDefenderHealth <= 0;

  return {
    attackerWon,
    battleLog,
    rounds: round,
    finalAttackerHealth: currentAttackerHealth,
    finalDefenderHealth: currentDefenderHealth
  };
}

function calculateLevelProgression({ currentExperience, experienceGain }) {
  const newExperience = currentExperience + experienceGain;
  const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
  const newPower = 100 + (newLevel - 1) * 20;
  const newMaxHealth = 100 + (newLevel - 1) * 15;
  return { newExperience, newLevel, newPower, newMaxHealth };
}

async function getMaxSpaceLevel(prisma) {
  const maxSpace = await prisma.space.aggregate({
    _max: { level: true }
  });
  return maxSpace._max.level || 1;
}

function calculateSpaceLevelUp(newLevel, currentSpaceLevel, maxSpaceLevel) {
  const unlockedSpaceLevel = newLevel >= (currentSpaceLevel * 5) ? currentSpaceLevel + 1 : currentSpaceLevel;
  return Math.min(unlockedSpaceLevel, maxSpaceLevel);
}

// Effective combat stats now factor in equipped gear, unlocked skills, and the
// chosen character class (see progression.js). Kept as getUserTotalStats so the
// existing battle handlers continue to work unchanged.
async function getUserTotalStats(prisma, userId, baseUser) {
  const { getEffectiveStats } = require('./progression');
  const { totalPower, totalHealth, breakdown } = await getEffectiveStats(prisma, userId, baseUser);
  return { totalPower, totalHealth, breakdown };
}

module.exports = {
  simulateBattle,
  calculateLevelProgression,
  getMaxSpaceLevel,
  calculateSpaceLevelUp,
  getUserTotalStats
};
