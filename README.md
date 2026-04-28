# ⚔️ SHOORVEER - Multi-Dimensional Online Game

An online multiplayer game inspired by the PocketFM story "Shoorveer", where warriors travel through multi-dimensional spaces, battle cosmic species, form alliances, and trade rewards.

## 🎮 Features

### Multi-Dimensional Spaces
- **6 Unique Spaces**: Space-1 through Space-6 with increasing difficulty
- Progressive unlocking system - complete one space to unlock the next
- Each space has unique cosmic species to battle
- Real-time player presence in spaces via WebSocket

### Account System
- Secure registration and login with JWT authentication
- Profile system with stats tracking
- Starter items for new warriors

### Battle System
- Turn-based battle mechanics with species
- Animated battle logs showing each round
- Reward system: Points, Crystals, and Item drops
- Experience-based leveling system
- Power and health progression

### Alliance System
- Create or join alliances with other warriors
- Alliance membership with roles (leader, officer, member)
- Collaborate with teammates for strategic advantage

### Trading System
- Exchange points, crystals, and items with other players
- Pending trade management
- Secure transaction system

### Leaderboard
- Global rankings based on points
- Win/loss tracking
- Level and power display

### Real-Time Features
- WebSocket-powered real-time chat in spaces
- See online players in your current space
- Real-time player join/leave notifications

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT-based auth
- **Real-time**: Socket.io for WebSocket connections
- **API Routes**:
  - `/api/auth` - Authentication
  - `/api/game` - Game mechanics (spaces, battles, leaderboard)
  - `/api/alliance` - Alliance management
  - `/api/trade` - Trading system

### Frontend (React + Vite)
- **Routing**: React Router
- **State**: React Context for Auth and Socket
- **HTTP Client**: Axios
- **Styling**: Custom CSS with dark space theme

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. Install dependencies and setup database:
```bash
npm run setup
```

2. Start the server:
```bash
npm run server
```

3. In a new terminal, start the client:
```bash
npm run client
```

4. Open your browser to `http://localhost:3000`

### Default Game Data
The setup script seeds the database with:
- 6 Spaces with increasing difficulty
- 18 Species across all spaces
- Each space has unique requirements and reward multipliers

## 🌌 Game Mechanics

### Spaces
| Space | Name | Min Level | Min Power | Reward Multiplier |
|-------|------|-----------|-----------|-------------------|
| Space-1 | The Beginning | 1 | 0 | 1.0x |
| Space-2 | The Void | 5 | 200 | 1.5x |
| Space-3 | Nebula Storm | 10 | 500 | 2.0x |
| Space-4 | Quantum Realm | 15 | 1000 | 2.5x |
| Space-5 | The Abyss | 20 | 2000 | 3.5x |
| Space-6 | Singularity | 30 | 5000 | 5.0x |

### Leveling
- Gain experience by winning battles
- Level up increases power and health
- Every 5 levels unlocks a new space

### Rewards
- **Points**: Primary currency for progression
- **Crystals**: Premium currency for high-tier items
- **Items**: Weapons, armor, potions, artifacts with rarity tiers

## 📁 Project Structure

```
shoorveer-game/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── game.js
│   │   │   ├── alliance.js
│   │   │   └── trade.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── utils/
│   │   │   ├── prisma.js
│   │   │   └── seed.js
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Spaces.jsx
│   │   │   ├── SpaceDetail.jsx
│   │   │   ├── Battle.jsx
│   │   │   ├── Alliances.jsx
│   │   │   ├── Trades.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   └── Profile.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── package.json
```

## 🛡️ Security
- Password hashing with bcryptjs
- JWT token authentication
- Route protection middleware
- Input validation on all endpoints

## 🚢 Production Deployment
- Dockerized single-service deployment is supported for Coolify.
- Frontend is built with Vite and served by the Express backend in production.
- Use the full deployment runbook: `docs/COOLIFY_GITHUB_DEPLOYMENT.md`
- Copy environment values from `.env.example` and set them in Coolify.
- Important: mount persistent storage at `/app/data` for SQLite durability.

## 🔮 Future Enhancements
- Player vs Player (PvP) battles
- Alliance wars and territory control
- Daily quests and achievements
- Item crafting system
- In-game marketplace
- Mobile responsive app

## 📜 License
MIT License - Feel free to use and modify!

---

*Inspired by the PocketFM story "Shoorveer" - a tale of warriors across dimensions.*
