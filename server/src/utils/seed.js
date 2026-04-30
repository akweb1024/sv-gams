const { v4: uuidv4 } = require('uuid');
const prisma = require('./prisma');

const spacesData = [
  { level: 1, name: 'Space-1: The Beginning', description: 'Where warriors first awaken. The frontier of the unknown.', minPower: 0, minLevel: 1, rewardMultiplier: 1.0, speciesCount: 5 },
  { level: 2, name: 'Space-2: The Void', description: 'Darkness consumes all. Only the brave enter.', minPower: 200, minLevel: 5, rewardMultiplier: 1.5, speciesCount: 7 },
  { level: 3, name: 'Space-3: Nebula Storm', description: 'Cosmic storms rage. Power is tested here.', minPower: 500, minLevel: 10, rewardMultiplier: 2.0, speciesCount: 8 },
  { level: 4, name: 'Space-4: Quantum Realm', description: 'Reality bends. Only masters survive.', minPower: 1000, minLevel: 15, rewardMultiplier: 2.5, speciesCount: 10 },
  { level: 5, name: 'Space-5: The Abyss', description: 'The edge of existence. Legends are forged here.', minPower: 2000, minLevel: 20, rewardMultiplier: 3.5, speciesCount: 12 },
  { level: 6, name: 'Space-6: Singularity', description: 'All paths converge. The ultimate test.', minPower: 5000, minLevel: 30, rewardMultiplier: 5.0, speciesCount: 15 },
];

const speciesData = [
  // Space 1
  { name: 'Void Crawler', spaceLevel: 1, power: 50, health: 80, abilities: '{"attack": "claw", "defense": "shell"}', rewardPoints: 15, rewardCrystals: 0, rarity: 'common' },
  { name: 'Star Wisp', spaceLevel: 1, power: 70, health: 60, abilities: '{"attack": "beam", "defense": "blink"}', rewardPoints: 20, rewardCrystals: 0, rarity: 'common' },
  { name: 'Nebula Serpent', spaceLevel: 1, power: 90, health: 100, abilities: '{"attack": "venom", "defense": "coil"}', rewardPoints: 30, rewardCrystals: 1, rarity: 'rare' },
  { name: 'Cosmic Wolf', spaceLevel: 1, power: 110, health: 120, abilities: '{"attack": "bite", "defense": "pack"}', rewardPoints: 40, rewardCrystals: 2, rarity: 'rare' },
  { name: 'Dark Shaman', spaceLevel: 1, power: 150, health: 150, abilities: '{"attack": "curse", "defense": "shield"}', rewardPoints: 60, rewardCrystals: 3, rarity: 'epic' },

  // Space 2
  { name: 'Void Reaper', spaceLevel: 2, power: 250, health: 200, abilities: '{"attack": "scythe", "defense": "phase"}', rewardPoints: 80, rewardCrystals: 2, rarity: 'common' },
  { name: 'Star Leviathan', spaceLevel: 2, power: 300, health: 250, abilities: '{"attack": "swallow", "defense": "armor"}', rewardPoints: 100, rewardCrystals: 3, rarity: 'common' },
  { name: 'Nebula Phantom', spaceLevel: 2, power: 350, health: 180, abilities: '{"attack": "haunt", "defense": "vanish"}', rewardPoints: 120, rewardCrystals: 5, rarity: 'rare' },
  { name: 'Quantum Beast', spaceLevel: 2, power: 400, health: 300, abilities: '{"attack": "charge", "defense": "split"}', rewardPoints: 150, rewardCrystals: 8, rarity: 'epic' },
  { name: 'Cosmic Titan', spaceLevel: 2, power: 500, health: 400, abilities: '{"attack": "smash", "defense": "fortress"}', rewardPoints: 200, rewardCrystals: 10, rarity: 'legendary' },

  // Space 3
  { name: 'Storm Elemental', spaceLevel: 3, power: 600, health: 450, abilities: '{"attack": "lightning", "defense": "wind"}', rewardPoints: 250, rewardCrystals: 5, rarity: 'common' },
  { name: 'Nebula Dragon', spaceLevel: 3, power: 700, health: 500, abilities: '{"attack": "breath", "defense": "wings"}', rewardPoints: 300, rewardCrystals: 8, rarity: 'common' },
  { name: 'Void Emperor', spaceLevel: 3, power: 850, health: 600, abilities: '{"attack": "dominate", "defense": "aura"}', rewardPoints: 400, rewardCrystals: 15, rarity: 'epic' },
  { name: 'Star Colossus', spaceLevel: 3, power: 1000, health: 800, abilities: '{"attack": "crush", "defense": "mountain"}', rewardPoints: 500, rewardCrystals: 20, rarity: 'legendary' },

  // Space 4+
  { name: 'Quantum Shifter', spaceLevel: 4, power: 1200, health: 900, abilities: '{"attack": "reality", "defense": "shift"}', rewardPoints: 600, rewardCrystals: 15, rarity: 'epic' },
  { name: 'Void Overlord', spaceLevel: 4, power: 1500, health: 1000, abilities: '{"attack": "oblivion", "defense": "void"}', rewardPoints: 800, rewardCrystals: 30, rarity: 'legendary' },
  { name: 'Cosmic Demigod', spaceLevel: 5, power: 2500, health: 2000, abilities: '{"attack": "nova", "defense": "immortal"}', rewardPoints: 1500, rewardCrystals: 50, rarity: 'legendary' },
  { name: 'The Singularity', spaceLevel: 6, power: 5000, health: 4000, abilities: '{"attack": "universe", "defense": "eternal"}', rewardPoints: 3000, rewardCrystals: 100, rarity: 'legendary' },
];

// NPC warriors for each space (computer-controlled opponents)
const npcWarriorsData = [
  // Space 1 NPCs
  { username: 'npc_void_striker', displayName: 'Void Striker', level: 2, power: 80, health: 90, maxHealth: 90, spaceLevel: 1, wins: 5, losses: 2, email: 'npc1@shoorveer.game', password: 'npc_secret_1' },
  { username: 'npc_star_hunter', displayName: 'Star Hunter', level: 3, power: 100, health: 100, maxHealth: 100, spaceLevel: 1, wins: 8, losses: 3, email: 'npc2@shoorveer.game', password: 'npc_secret_2' },
  { username: 'npc_dark_scout', displayName: 'Dark Scout', level: 2, power: 70, health: 85, maxHealth: 85, spaceLevel: 1, wins: 4, losses: 4, email: 'npc3@shoorveer.game', password: 'npc_secret_3' },

  // Space 2 NPCs
  { username: 'npc_void_knight', displayName: 'Void Knight', level: 7, power: 280, health: 250, maxHealth: 250, spaceLevel: 2, wins: 15, losses: 5, email: 'npc4@shoorveer.game', password: 'npc_secret_4' },
  { username: 'npc_storm_warden', displayName: 'Storm Warden', level: 8, power: 320, health: 280, maxHealth: 280, spaceLevel: 2, wins: 20, losses: 6, email: 'npc5@shoorveer.game', password: 'npc_secret_5' },
  { username: 'npc_shadow_assassin', displayName: 'Shadow Assassin', level: 6, power: 260, health: 200, maxHealth: 200, spaceLevel: 2, wins: 12, losses: 8, email: 'npc6@shoorveer.game', password: 'npc_secret_6' },

  // Space 3 NPCs
  { username: 'npc_nebula_champion', displayName: 'Nebula Champion', level: 12, power: 650, health: 500, maxHealth: 500, spaceLevel: 3, wins: 35, losses: 10, email: 'npc7@shoorveer.game', password: 'npc_secret_7' },
  { username: 'npc_cosmic_guardian', displayName: 'Cosmic Guardian', level: 13, power: 720, health: 550, maxHealth: 550, spaceLevel: 3, wins: 40, losses: 8, email: 'npc8@shoorveer.game', password: 'npc_secret_8' },
  { username: 'npc_void_commander', displayName: 'Void Commander', level: 11, power: 600, health: 480, maxHealth: 480, spaceLevel: 3, wins: 30, losses: 12, email: 'npc9@shoorveer.game', password: 'npc_secret_9' },

  // Space 4 NPCs
  { username: 'npc_quantum_master', displayName: 'Quantum Master', level: 17, power: 1300, health: 950, maxHealth: 950, spaceLevel: 4, wins: 60, losses: 15, email: 'npc10@shoorveer.game', password: 'npc_secret_10' },
  { username: 'npc_reality_shaper', displayName: 'Reality Shaper', level: 18, power: 1450, health: 1000, maxHealth: 1000, spaceLevel: 4, wins: 70, losses: 12, email: 'npc11@shoorveer.game', password: 'npc_secret_11' },
  { username: 'npc_dimension_walker', displayName: 'Dimension Walker', level: 16, power: 1200, health: 900, maxHealth: 900, spaceLevel: 4, wins: 55, losses: 18, email: 'npc12@shoorveer.game', password: 'npc_secret_12' },

  // Space 5 NPCs
  { username: 'npc_abyss_lord', displayName: 'Abyss Lord', level: 23, power: 2500, health: 1800, maxHealth: 1800, spaceLevel: 5, wins: 100, losses: 20, email: 'npc13@shoorveer.game', password: 'npc_secret_13' },
  { username: 'npc_eternal_warrior', displayName: 'Eternal Warrior', level: 24, power: 2800, health: 2000, maxHealth: 2000, spaceLevel: 5, wins: 120, losses: 15, email: 'npc14@shoorveer.game', password: 'npc_secret_14' },
  { username: 'npc_void_sovereign', displayName: 'Void Sovereign', level: 22, power: 2400, health: 1700, maxHealth: 1700, spaceLevel: 5, wins: 90, losses: 25, email: 'npc15@shoorveer.game', password: 'npc_secret_15' },

  // Space 6 NPCs
  { username: 'npc_singularity_avatar', displayName: 'Singularity Avatar', level: 35, power: 5500, health: 4000, maxHealth: 4000, spaceLevel: 6, wins: 200, losses: 30, email: 'npc16@shoorveer.game', password: 'npc_secret_16' },
  { username: 'npc_universe_devourer', displayName: 'Universe Devourer', level: 38, power: 6500, health: 4500, maxHealth: 4500, spaceLevel: 6, wins: 250, losses: 20, email: 'npc17@shoorveer.game', password: 'npc_secret_17' },
  { username: 'npc_cosmic_overlord', displayName: 'Cosmic Overlord', level: 40, power: 7000, health: 5000, maxHealth: 5000, spaceLevel: 6, wins: 300, losses: 10, email: 'npc18@shoorveer.game', password: 'npc_secret_18' },
];

const activitiesData = [
  // Space 1 - Easy brain teasers
  {
    type: 'riddle',
    title: 'Void Riddles',
    description: 'Solve cosmic riddles to test your wisdom.',
    difficulty: 'easy',
    spaceLevel: 1,
    data: JSON.stringify({
      questions: [
        { question: 'I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. I have roads, but no cars drive there. What am I?', answer: 'map', points: 15, explanation: 'A map shows all these things but contains none of them.' },
        { question: 'The more you take, the more you leave behind. What am I?', answer: 'footsteps', points: 15, explanation: 'As you walk, you leave footsteps behind.' },
        { question: 'I am not alive, but I grow; I don\'t have lungs, but I need air; I don\'t have a mouth, but water kills me. What am I?', answer: 'fire', points: 15, explanation: 'Fire grows, needs oxygen (air), and is extinguished by water.' },
      ],
      passThreshold: 30
    }),
    rewardPoints: 30,
    rewardCrystals: 1,
    timeLimit: 120
  },
  {
    type: 'math',
    title: 'Cosmic Calculations',
    description: 'Solve space-themed math problems.',
    difficulty: 'easy',
    spaceLevel: 1,
    data: JSON.stringify({
      questions: [
        { question: 'If a spaceship travels at 60,000 km/h, how far will it travel in 3 hours?', answer: '180000', points: 10, explanation: 'Distance = Speed × Time = 60,000 × 3 = 180,000 km' },
        { question: 'A planet has 4 moons. If each moon has 3 craters, how many craters total?', answer: '12', points: 10, explanation: '4 moons × 3 craters = 12 craters total' },
        { question: 'What is 7 × 8 + 15?', answer: '71', points: 10, explanation: '7 × 8 = 56, then 56 + 15 = 71' },
        { question: 'If a star is 100 light-years away and light travels 1 light-year per year, how many years does light take to reach us?', answer: '100', points: 10, explanation: '100 light-years = 100 years of travel time' },
      ],
      passThreshold: 25
    }),
    rewardPoints: 35,
    rewardCrystals: 1,
    timeLimit: 90
  },
  {
    type: 'pattern',
    title: 'Star Patterns',
    description: 'Complete the cosmic pattern sequences.',
    difficulty: 'easy',
    spaceLevel: 1,
    data: JSON.stringify({
      questions: [
        { question: 'Complete the sequence: 2, 4, 8, 16, __', answer: '32', points: 10, explanation: 'Each number is multiplied by 2 (powers of 2).' },
        { question: 'Complete the sequence: 1, 1, 2, 3, 5, 8, __', answer: '13', points: 15, explanation: 'Fibonacci sequence: each number is the sum of the two before it (5 + 8 = 13).' },
        { question: 'Complete the sequence: 3, 6, 11, 18, 27, __', answer: '38', points: 15, explanation: 'The differences increase by 2 each time: +3, +5, +7, +9, +11. So 27 + 11 = 38.' },
      ],
      passThreshold: 25
    }),
    rewardPoints: 30,
    rewardCrystals: 1,
    timeLimit: 90
  },
  {
    type: 'memory',
    title: 'Memory Constellation',
    description: 'Match the cosmic symbols before time runs out!',
    difficulty: 'easy',
    spaceLevel: 1,
    data: JSON.stringify({ gridSize: 4, pairs: 8, timeBonus: true }),
    rewardPoints: 25,
    rewardCrystals: 1,
    timeLimit: 60
  },

  // Space 2 - Medium difficulty
  {
    type: 'riddle',
    title: 'Nebula Enigmas',
    description: 'Harder riddles from the deep void.',
    difficulty: 'medium',
    spaceLevel: 2,
    data: JSON.stringify({
      questions: [
        { question: 'I am always in front of you but can never be seen. What am I?', answer: 'future', points: 20, explanation: 'The future is always ahead but cannot be seen.' },
        { question: 'The person who makes it, sells it. The person who buys it, never uses it. The person who uses it, never knows they\'re using it. What is it?', answer: 'coffin', points: 20, explanation: 'A coffin is made by a carpenter, bought by family, and used by the dead.' },
        { question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?', answer: 'echo', points: 20, explanation: 'An echo speaks (repeats sounds) and is carried by wind.' },
      ],
      passThreshold: 40
    }),
    rewardPoints: 50,
    rewardCrystals: 2,
    timeLimit: 120
  },
  {
    type: 'math',
    title: 'Quantum Math',
    description: 'Advanced calculations for space navigation.',
    difficulty: 'medium',
    spaceLevel: 2,
    data: JSON.stringify({
      questions: [
        { question: 'A black hole has a radius of 50 km. What is its circumference? (Use C = 2πr, π ≈ 3.14)', answer: '314', points: 15, explanation: 'C = 2 × 3.14 × 50 = 314 km' },
        { question: 'If 5 astronauts can build a station in 20 days, how many days for 10 astronauts?', answer: '10', points: 15, explanation: 'More workers = less time. 5 × 20 = 100 worker-days. 100 / 10 = 10 days.' },
        { question: 'What is the square root of 144 plus the cube of 3?', answer: '39', points: 15, explanation: '√144 = 12, 3³ = 27, 12 + 27 = 39' },
        { question: 'A spaceship accelerates from 0 to 30,000 km/h in 5 hours. What is its average acceleration in km/h²?', answer: '6000', points: 15, explanation: 'Acceleration = (30000 - 0) / 5 = 6000 km/h²' },
      ],
      passThreshold: 40
    }),
    rewardPoints: 55,
    rewardCrystals: 2,
    timeLimit: 120
  },
  {
    type: 'pattern',
    title: 'Quantum Patterns',
    description: 'Decode the advanced cosmic sequences.',
    difficulty: 'medium',
    spaceLevel: 2,
    data: JSON.stringify({
      questions: [
        { question: 'Complete: 1, 4, 9, 16, 25, 36, __', answer: '49', points: 15, explanation: 'Perfect squares: 1², 2², 3², 4², 5², 6², 7² = 49' },
        { question: 'Complete: 2, 6, 12, 20, 30, 42, __', answer: '56', points: 20, explanation: 'Differences: +4, +6, +8, +10, +12, +14. So 42 + 14 = 56' },
        { question: 'Complete: 1, 2, 6, 24, 120, __', answer: '720', points: 20, explanation: 'Factorials: 1!, 2!, 3!, 4!, 5!, 6! = 720' },
      ],
      passThreshold: 40
    }),
    rewardPoints: 50,
    rewardCrystals: 2,
    timeLimit: 100
  },
  {
    type: 'memory',
    title: 'Nebula Memory',
    description: 'Match advanced cosmic symbols in a larger grid!',
    difficulty: 'medium',
    spaceLevel: 2,
    data: JSON.stringify({ gridSize: 6, pairs: 18, timeBonus: true }),
    rewardPoints: 45,
    rewardCrystals: 2,
    timeLimit: 90
  },

  // Space 3 - Hard difficulty
  {
    type: 'riddle',
    title: 'Singularity Mysteries',
    description: 'The most challenging cosmic riddles.',
    difficulty: 'hard',
    spaceLevel: 3,
    data: JSON.stringify({
      questions: [
        { question: 'I have keys but no locks. I have space but no room. You can enter but can\'t go outside. What am I?', answer: 'keyboard', points: 25, explanation: 'A keyboard has keys, spacebar, and you enter data but cannot exit.' },
        { question: 'What has a heart that doesn\'t beat?', answer: 'artichoke', points: 25, explanation: 'An artichoke has a "heart" (the edible center) but no actual heart.' },
        { question: 'I have a spine but no bones. What am I?', answer: 'book', points: 25, explanation: 'A book has a spine (binding) but no bones.' },
      ],
      passThreshold: 50
    }),
    rewardPoints: 80,
    rewardCrystals: 3,
    timeLimit: 120
  },
  {
    type: 'math',
    title: 'Abyss Mathematics',
    description: 'Complex calculations for deep space travel.',
    difficulty: 'hard',
    spaceLevel: 3,
    data: JSON.stringify({
      questions: [
        { question: 'If E = mc² and m = 2 kg, c = 300,000,000 m/s, what is E in joules? (Answer in scientific notation: a × 10^b)', answer: '1.8 × 10^17', points: 25, explanation: 'E = 2 × (3×10⁸)² = 2 × 9×10¹⁶ = 1.8×10¹⁷ J' },
        { question: 'A planet orbits its star every 365 days at a distance of 150 million km. If another planet orbits at 600 million km, approximately how many days is its year? (Use Kepler\'s 3rd law: T² ∝ r³)', answer: '2920', points: 25, explanation: 'T₂/T₁ = √(r₂³/r₁³) = √(4³) = √64 = 8. So T₂ = 365 × 8 = 2,920 days' },
        { question: 'Solve: If x² + 5x + 6 = 0, what is x? (Give the smaller value)', answer: '-3', points: 25, explanation: 'Factor: (x+2)(x+3) = 0, so x = -2 or x = -3. Smaller is -3.' },
        { question: 'A spaceship travels 4 light-years to Alpha Centauri at 0.8c. How many years does the trip take from Earth\'s perspective?', answer: '5', points: 25, explanation: 'Time = Distance/Speed = 4/0.8 = 5 years' },
      ],
      passThreshold: 60
    }),
    rewardPoints: 90,
    rewardCrystals: 3,
    timeLimit: 150
  },

  // Physics Game for all spaces
  {
    type: 'physics',
    title: 'Gravity Orbit',
    description: 'Use physics and gravity to navigate your ship through planetary orbits! Tap/Click to thrust. Avoid crashing into planets. Survive as long as possible!',
    difficulty: 'medium',
    spaceLevel: 1,
    data: JSON.stringify({
      description: 'Control your ship with thrust. Planets exert gravitational pull. Orbit to survive!',
      gravityStrength: 0.5,
      planetCount: 3,
      minScore: 100
    }),
    rewardPoints: 50,
    rewardCrystals: 2,
    timeLimit: 120
  },
  {
    type: 'physics',
    title: 'Void Slingshot',
    description: 'Advanced gravity navigation with multiple celestial bodies. Use gravitational slingshot to gain speed!',
    difficulty: 'hard',
    spaceLevel: 2,
    data: JSON.stringify({
      description: 'Master the slingshot maneuver! Use planet gravity to boost your ship.',
      gravityStrength: 0.8,
      planetCount: 5,
      minScore: 200
    }),
    rewardPoints: 80,
    rewardCrystals: 3,
    timeLimit: 120
  },
  {
    type: 'physics',
    title: 'Singularity Escape',
    description: 'Escape the event horizon! Navigate extreme gravitational fields near a black hole.',
    difficulty: 'hard',
    spaceLevel: 3,
    data: JSON.stringify({
      description: 'Extreme gravity near a black hole! One wrong move and you are spaghettified!',
      gravityStrength: 1.2,
      planetCount: 7,
      minScore: 300
    }),
    rewardPoints: 120,
    rewardCrystals: 5,
    timeLimit: 120
  },
];

async function seed() {
  console.log('Starting database seed...');

  // Seed spaces (idempotent)
  for (const space of spacesData) {
    await prisma.space.upsert({
      where: { level: space.level },
      update: {
        name: space.name,
        description: space.description,
        minPower: space.minPower,
        minLevel: space.minLevel,
        rewardMultiplier: space.rewardMultiplier,
        speciesCount: space.speciesCount,
      },
      create: space
    });
  }
  console.log(`Seeded ${spacesData.length} spaces`);

  // Seed species (idempotent)
  for (const species of speciesData) {
    await prisma.species.upsert({
      where: { name: species.name },
      update: {
        spaceLevel: species.spaceLevel,
        power: species.power,
        health: species.health,
        abilities: species.abilities,
        rewardPoints: species.rewardPoints,
        rewardCrystals: species.rewardCrystals,
        rarity: species.rarity,
      },
      create: species
    });
  }
  console.log(`Seeded ${speciesData.length} species`);

  // Seed activities (idempotent by title + spaceLevel)
  for (const activity of activitiesData) {
    const existing = await prisma.activity.findFirst({
      where: {
        title: activity.title,
        spaceLevel: activity.spaceLevel
      }
    });
    if (existing) {
      await prisma.activity.update({
        where: { id: existing.id },
        data: {
          type: activity.type,
          description: activity.description,
          difficulty: activity.difficulty,
          data: activity.data,
          rewardPoints: activity.rewardPoints,
          rewardCrystals: activity.rewardCrystals,
          timeLimit: activity.timeLimit,
          isActive: true
        }
      });
    } else {
      await prisma.activity.create({ data: activity });
    }
  }
  console.log(`Seeded ${activitiesData.length} activities`);

  // Seed NPC warriors (idempotent, do not touch real players)
  for (const npc of npcWarriorsData) {
    const user = await prisma.user.upsert({
      where: { username: npc.username },
      update: {
        displayName: npc.displayName,
        level: npc.level,
        power: npc.power,
        health: npc.health,
        maxHealth: npc.maxHealth,
        spaceLevel: npc.spaceLevel,
        wins: npc.wins,
        losses: npc.losses,
        isNpc: true,
        lastLogin: new Date(),
      },
      data: {
        ...npc,
        isNpc: true,
        createdAt: new Date(),
        lastLogin: new Date(),
      }
    });

    // Give NPCs some random items
    const npcItems = [
      { itemType: 'weapon', itemName: `${npc.displayName}'s Blade`, powerBonus: Math.floor(npc.power * 0.1), healthBonus: 0, rarity: 'rare', quantity: 1 },
      { itemType: 'armor', itemName: `${npc.displayName}'s Armor`, powerBonus: 0, healthBonus: Math.floor(npc.health * 0.1), rarity: 'rare', quantity: 1 },
    ];

    await prisma.inventoryItem.deleteMany({ where: { userId: user.id } });
    await prisma.inventoryItem.createMany({
      data: npcItems.map(item => ({ ...item, userId: user.id }))
    });
  }
  console.log(`Seeded ${npcWarriorsData.length} NPC warriors`);

  console.log('Database seed complete!');
}

module.exports = seed;

if (require.main === module) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
