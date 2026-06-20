const express = require('express');
const authMiddleware = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { CLASS_MODIFIERS } = require('../utils/progression');

const router = express.Router();

const RESET_COST_CRYSTALS = 10;

// GET /api/skills — class catalog, the player's class, skill points, and unlocked skills
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [skills, userSkills] = await Promise.all([
      prisma.skill.findMany({ orderBy: [{ className: 'asc' }, { tier: 'asc' }] }),
      prisma.userSkill.findMany({ where: { userId: req.user.id } }),
    ]);
    const unlocked = new Set(userSkills.map((s) => s.skillKey));

    res.json({
      classes: Object.entries(CLASS_MODIFIERS).map(([key, v]) => ({ key, ...v })),
      skills: skills.map((s) => ({ ...s, unlocked: unlocked.has(s.key) })),
      className: req.user.className,
      skillPoints: req.user.skillPoints,
      resetCostCrystals: RESET_COST_CRYSTALS,
    });
  } catch (error) {
    console.error('Skills list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/skills/class { className } — choose a class (only when none is set)
router.post('/class', authMiddleware, async (req, res) => {
  try {
    const { className } = req.body;
    if (!CLASS_MODIFIERS[className]) return res.status(400).json({ message: 'Invalid class' });
    if (req.user.className) {
      return res.status(400).json({ message: 'Class already chosen. Use reset to change class.' });
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { className },
      select: { className: true, skillPoints: true },
    });
    res.json({ message: `You are now a ${CLASS_MODIFIERS[className].label}`, ...updated });
  } catch (error) {
    console.error('Choose class error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/skills/unlock { skillKey }
router.post('/unlock', authMiddleware, async (req, res) => {
  try {
    const { skillKey } = req.body;
    if (!skillKey) return res.status(400).json({ message: 'skillKey required' });
    if (!req.user.className) return res.status(400).json({ message: 'Choose a class first' });

    const skill = await prisma.skill.findUnique({ where: { key: skillKey } });
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    if (skill.className !== req.user.className) {
      return res.status(403).json({ message: 'This skill belongs to another class' });
    }

    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillKey: { userId: req.user.id, skillKey } },
    });
    if (existing) return res.status(400).json({ message: 'Skill already unlocked' });

    if (skill.requires) {
      const prereq = await prisma.userSkill.findUnique({
        where: { userId_skillKey: { userId: req.user.id, skillKey: skill.requires } },
      });
      if (!prereq) return res.status(400).json({ message: 'Prerequisite skill not unlocked' });
    }

    if (req.user.skillPoints < skill.cost) {
      return res.status(400).json({ message: 'Not enough skill points' });
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { skillPoints: { decrement: skill.cost } }, select: { skillPoints: true } }),
      prisma.userSkill.create({ data: { userId: req.user.id, skillKey } }),
    ]);
    res.json({ message: `Unlocked ${skill.name}`, skillPoints: updatedUser.skillPoints });
  } catch (error) {
    console.error('Unlock skill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/skills/reset — respec: refund spent points, clear class & skills (costs crystals)
router.post('/reset', authMiddleware, async (req, res) => {
  try {
    if (req.user.crystals < RESET_COST_CRYSTALS) {
      return res.status(400).json({ message: `Reset costs ${RESET_COST_CRYSTALS} crystals` });
    }
    const userSkills = await prisma.userSkill.findMany({ where: { userId: req.user.id } });
    let refund = 0;
    if (userSkills.length > 0) {
      const defs = await prisma.skill.findMany({ where: { key: { in: userSkills.map((s) => s.skillKey) } } });
      refund = defs.reduce((sum, d) => sum + d.cost, 0);
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data: { className: null, crystals: { decrement: RESET_COST_CRYSTALS }, skillPoints: { increment: refund } },
        select: { className: true, skillPoints: true, crystals: true },
      }),
      prisma.userSkill.deleteMany({ where: { userId: req.user.id } }),
    ]);
    res.json({ message: 'Class and skills reset', refunded: refund, ...updatedUser });
  } catch (error) {
    console.error('Reset skills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
