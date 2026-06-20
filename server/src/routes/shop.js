const express = require('express');
const authMiddleware = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { getEffectiveStats } = require('../utils/progression');

const router = express.Router();

const SLOTS = ['weapon', 'armor', 'accessory'];

// Sell value of an inventory item: ~35% of its stat worth in points.
function sellValue(item) {
  const mult = 1 + 0.1 * (item.upgradeLevel || 0);
  const worth = (item.powerBonus + item.healthBonus) * mult * item.quantity;
  return Math.max(10, Math.floor(worth * 0.35));
}

// Cost to upgrade an item one level: scales with current upgrade level.
function upgradeCost(item) {
  const next = (item.upgradeLevel || 0) + 1;
  const base = item.powerBonus + item.healthBonus;
  return {
    points: Math.floor((100 + base * 2) * next),
    crystals: Math.max(0, Math.floor(next / 2)),
  };
}

// GET /api/shop — list shop catalog + the player's wallet
router.get('/', authMiddleware, async (req, res) => {
  try {
    const items = await prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: [{ minLevel: 'asc' }, { pricePoints: 'asc' }],
    });
    res.json({
      items,
      wallet: { points: req.user.points, crystals: req.user.crystals, level: req.user.level },
    });
  } catch (error) {
    console.error('Shop list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/shop/inventory — the player's owned items + effective stats
router.get('/inventory', authMiddleware, async (req, res) => {
  try {
    const inventory = await prisma.inventoryItem.findMany({
      where: { userId: req.user.id },
      orderBy: [{ equipped: 'desc' }, { rarity: 'asc' }],
    });
    const stats = await getEffectiveStats(prisma, req.user.id, req.user);
    res.json({
      inventory: inventory.map((i) => ({ ...i, sellValue: sellValue(i), upgradeCost: i.slot ? upgradeCost(i) : null })),
      stats: { totalPower: stats.totalPower, totalHealth: stats.totalHealth, breakdown: stats.breakdown },
    });
  } catch (error) {
    console.error('Inventory list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shop/buy { shopItemId }
router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { shopItemId } = req.body;
    if (!shopItemId) return res.status(400).json({ message: 'shopItemId required' });

    const shopItem = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
    if (!shopItem || !shopItem.isActive) return res.status(404).json({ message: 'Item not found' });

    const user = req.user;
    if (user.level < shopItem.minLevel) {
      return res.status(403).json({ message: `Requires level ${shopItem.minLevel}` });
    }
    if (user.points < shopItem.pricePoints || user.crystals < shopItem.priceCrystals) {
      return res.status(400).json({ message: 'Not enough currency' });
    }

    const [updatedUser, newItem] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { points: { decrement: shopItem.pricePoints }, crystals: { decrement: shopItem.priceCrystals } },
        select: { points: true, crystals: true },
      }),
      prisma.inventoryItem.create({
        data: {
          userId: user.id,
          itemName: shopItem.name,
          itemType: shopItem.itemType,
          rarity: shopItem.rarity,
          powerBonus: shopItem.powerBonus,
          healthBonus: shopItem.healthBonus,
          slot: shopItem.slot,
          equipped: false,
          quantity: 1,
        },
      }),
    ]);

    res.json({ message: 'Purchased', item: newItem, wallet: updatedUser });
  } catch (error) {
    console.error('Buy error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shop/inventory/:id/equip — equip an item, swapping out its slot
router.post('/inventory/:id/equip', authMiddleware, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (!item.slot || !SLOTS.includes(item.slot)) {
      return res.status(400).json({ message: 'This item cannot be equipped' });
    }

    await prisma.$transaction([
      // Unequip anything currently in this slot
      prisma.inventoryItem.updateMany({
        where: { userId: req.user.id, slot: item.slot, equipped: true },
        data: { equipped: false },
      }),
      prisma.inventoryItem.update({ where: { id: item.id }, data: { equipped: true } }),
    ]);

    const stats = await getEffectiveStats(prisma, req.user.id, req.user);
    res.json({ message: 'Equipped', stats: { totalPower: stats.totalPower, totalHealth: stats.totalHealth } });
  } catch (error) {
    console.error('Equip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shop/inventory/:id/unequip
router.post('/inventory/:id/unequip', authMiddleware, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await prisma.inventoryItem.update({ where: { id: item.id }, data: { equipped: false } });
    const stats = await getEffectiveStats(prisma, req.user.id, req.user);
    res.json({ message: 'Unequipped', stats: { totalPower: stats.totalPower, totalHealth: stats.totalHealth } });
  } catch (error) {
    console.error('Unequip error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shop/inventory/:id/sell — sell for points
router.post('/inventory/:id/sell', authMiddleware, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const value = sellValue(item);
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { points: { increment: value } }, select: { points: true, crystals: true } }),
      prisma.inventoryItem.delete({ where: { id: item.id } }),
    ]);
    res.json({ message: `Sold for ${value} points`, value, wallet: updatedUser });
  } catch (error) {
    console.error('Sell error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shop/inventory/:id/upgrade — spend currency to boost an item
router.post('/inventory/:id/upgrade', authMiddleware, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (!item.slot) return res.status(400).json({ message: 'This item cannot be upgraded' });
    if ((item.upgradeLevel || 0) >= 10) return res.status(400).json({ message: 'Max upgrade level reached' });

    const cost = upgradeCost(item);
    if (req.user.points < cost.points || req.user.crystals < cost.crystals) {
      return res.status(400).json({ message: 'Not enough currency to upgrade' });
    }

    const [updatedUser, updatedItem] = await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { points: { decrement: cost.points }, crystals: { decrement: cost.crystals } }, select: { points: true, crystals: true } }),
      prisma.inventoryItem.update({ where: { id: item.id }, data: { upgradeLevel: { increment: 1 } } }),
    ]);
    res.json({ message: 'Upgraded', item: updatedItem, wallet: updatedUser });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
