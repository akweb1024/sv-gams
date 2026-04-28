const express = require('express');
const prisma = require('../utils/prisma');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all activities for a space level
router.get('/:spaceLevel', authMiddleware, async (req, res) => {
  try {
    const spaceLevel = parseInt(req.params.spaceLevel);
    const user = req.user;

    if (user.spaceLevel < spaceLevel) {
      return res.status(403).json({ message: 'Space not unlocked' });
    }

    const activities = await prisma.activity.findMany({
      where: {
        spaceLevel: spaceLevel,
        isActive: true
      },
      orderBy: { difficulty: 'asc' }
    });

    // Get user's progress on each activity
    const userActivities = await prisma.userActivity.findMany({
      where: { userId: user.id }
    });

    const activitiesWithProgress = activities.map(act => {
      const ua = userActivities.find(ua => ua.activityId === act.id);
      return {
        ...act,
        userProgress: ua || null
      };
    });

    res.json({ activities: activitiesWithProgress });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single activity
router.get('/detail/:id', authMiddleware, async (req, res) => {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id }
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    const userActivity = await prisma.userActivity.findFirst({
      where: {
        userId: req.user.id,
        activityId: activity.id
      }
    });

    res.json({ activity, userProgress: userActivity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit activity answer
router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;
    const user = req.user;

    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id }
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    if (user.spaceLevel < activity.spaceLevel) {
      return res.status(403).json({ message: 'Space not unlocked' });
    }

    const activityData = JSON.parse(activity.data || '{}');
    let score = 0;
    let correctCount = 0;
    const results = [];

    // Validate answers based on activity type
    if (activity.type === 'riddle' || activity.type === 'math' || activity.type === 'pattern') {
      const questions = activityData.questions || [];
      questions.forEach((q, i) => {
        const userAnswer = answers[i];
        const isCorrect = userAnswer && userAnswer.toString().toLowerCase().trim() === q.answer.toString().toLowerCase().trim();
        if (isCorrect) {
          score += q.points || 10;
          correctCount++;
        }
        results.push({
          question: q.question,
          userAnswer,
          correctAnswer: q.answer,
          isCorrect,
          explanation: q.explanation || null
        });
      });
    } else if (activity.type === 'memory') {
      // Memory game: score based on matches found
      score = answers.score || 0;
      correctCount = score;
    } else if (activity.type === 'physics') {
      // Physics game: score based on survival time / orbits completed
      score = answers.score || 0;
      correctCount = score;
    }

    const totalQuestions = activityData.questions?.length || 1;
    const passed = score >= (activityData.passThreshold || totalQuestions * 5);

    // Update or create user activity record
    let userActivity = await prisma.userActivity.findFirst({
      where: {
        userId: user.id,
        activityId: activity.id
      }
    });

    const now = new Date();

    if (!userActivity) {
      userActivity = await prisma.userActivity.create({
        data: {
          userId: user.id,
          activityId: activity.id,
          score,
          completed: passed,
          attempts: 1,
          bestTime: timeTaken,
          completedAt: passed ? now : null
        }
      });
    } else {
      const newBestTime = userActivity.bestTime
        ? Math.min(userActivity.bestTime, timeTaken)
        : timeTaken;

      userActivity = await prisma.userActivity.update({
        where: { id: userActivity.id },
        data: {
          score: Math.max(userActivity.score, score),
          completed: userActivity.completed || passed,
          attempts: { increment: 1 },
          bestTime: newBestTime,
          completedAt: (!userActivity.completed && passed) ? now : userActivity.completedAt
        }
      });
    }

    // Give rewards if passed and not previously completed
    let rewards = null;
    if (passed && !userActivity.completed) {
      const pointsEarned = activity.rewardPoints;
      const crystalsEarned = activity.rewardCrystals;
      const experienceGain = pointsEarned * 3;

      const newExperience = user.experience + experienceGain;
      const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
      const newPower = 100 + (newLevel - 1) * 20;
      const newMaxHealth = 100 + (newLevel - 1) * 15;
      const spaceLevelUp = newLevel >= (user.spaceLevel * 5) ? user.spaceLevel + 1 : user.spaceLevel;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          experience: newExperience,
          level: newLevel,
          power: newPower,
          maxHealth: newMaxHealth,
          health: newMaxHealth,
          points: { increment: pointsEarned },
          crystals: { increment: crystalsEarned },
          spaceLevel: spaceLevelUp
        }
      });

      rewards = {
        points: pointsEarned,
        crystals: crystalsEarned,
        experience: experienceGain,
        leveledUp: newLevel > user.level
      };
    }

    res.json({
      score,
      correctCount,
      totalQuestions,
      passed,
      results,
      rewards,
      timeTaken,
      attempts: userActivity.attempts
    });
  } catch (error) {
    console.error('Submit activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's activity history
router.get('/user/history', authMiddleware, async (req, res) => {
  try {
    const history = await prisma.userActivity.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ history });
  } catch (error) {
    console.error('Activity history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
