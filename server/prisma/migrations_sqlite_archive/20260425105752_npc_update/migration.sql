-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_battles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "spaceLevel" INTEGER NOT NULL,
    "winnerId" TEXT,
    "battleType" TEXT NOT NULL DEFAULT 'pvp',
    "attackerPower" INTEGER NOT NULL,
    "defenderPower" INTEGER NOT NULL,
    "attackerHealth" INTEGER NOT NULL,
    "defenderHealth" INTEGER NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "rewardType" TEXT,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "battles_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_battles" ("attackerHealth", "attackerId", "attackerPower", "createdAt", "defenderHealth", "defenderId", "defenderPower", "endedAt", "id", "log", "pointsEarned", "rewardAmount", "rewardType", "rounds", "spaceLevel", "status", "winnerId") SELECT "attackerHealth", "attackerId", "attackerPower", "createdAt", "defenderHealth", "defenderId", "defenderPower", "endedAt", "id", "log", "pointsEarned", "rewardAmount", "rewardType", "rounds", "spaceLevel", "status", "winnerId" FROM "battles";
DROP TABLE "battles";
ALTER TABLE "new_battles" RENAME TO "battles";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT,
    "avatar" TEXT,
    "isNpc" BOOLEAN NOT NULL DEFAULT false,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "power" INTEGER NOT NULL DEFAULT 100,
    "health" INTEGER NOT NULL DEFAULT 100,
    "maxHealth" INTEGER NOT NULL DEFAULT 100,
    "points" INTEGER NOT NULL DEFAULT 0,
    "crystals" INTEGER NOT NULL DEFAULT 0,
    "spaceLevel" INTEGER NOT NULL DEFAULT 1,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLogin" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("avatar", "createdAt", "crystals", "displayName", "draws", "email", "experience", "health", "id", "lastLogin", "level", "losses", "maxHealth", "password", "points", "power", "spaceLevel", "username", "wins") SELECT "avatar", "createdAt", "crystals", "displayName", "draws", "email", "experience", "health", "id", "lastLogin", "level", "losses", "maxHealth", "password", "points", "power", "spaceLevel", "username", "wins" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
