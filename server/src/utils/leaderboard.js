const prisma = require('./prisma');

const LAST_WEEK_REWARD_BY_RANK = {
  1: { points: 5000, crystals: 120, title: 'Champion' },
  2: { points: 3000, crystals: 80, title: 'Runner-up' },
  3: { points: 1800, crystals: 50, title: 'Elite Contender' }
};

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

module.exports = {
  getWeekStartUtc,
  getSeasonWindow,
  getAdminUsernames,
  isAdminUser,
  buildBossLeaderboardForSeason,
  archiveLastWeekRewards,
  LAST_WEEK_REWARD_BY_RANK
};
