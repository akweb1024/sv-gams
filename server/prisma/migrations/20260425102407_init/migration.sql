-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT,
    "avatar" TEXT,
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

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "powerBonus" INTEGER NOT NULL DEFAULT 0,
    "healthBonus" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "inventory_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "spaceLevel" INTEGER NOT NULL,
    "winnerId" TEXT,
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
    CONSTRAINT "battles_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "battles_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alliances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "spaceLevel" INTEGER NOT NULL DEFAULT 1,
    "leaderId" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "alliance_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allianceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alliance_members_allianceId_fkey" FOREIGN KEY ("allianceId") REFERENCES "alliances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alliance_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "offerAmount" INTEGER NOT NULL DEFAULT 0,
    "offerItemId" TEXT,
    "requestType" TEXT NOT NULL,
    "requestAmount" INTEGER NOT NULL DEFAULT 0,
    "requestItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "trades_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trades_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minPower" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "rewardMultiplier" REAL NOT NULL DEFAULT 1.0,
    "speciesCount" INTEGER NOT NULL DEFAULT 5
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "spaceLevel" INTEGER NOT NULL,
    "power" INTEGER NOT NULL,
    "health" INTEGER NOT NULL,
    "abilities" TEXT,
    "rewardPoints" INTEGER NOT NULL DEFAULT 10,
    "rewardCrystals" INTEGER NOT NULL DEFAULT 0,
    "rarity" TEXT NOT NULL DEFAULT 'common'
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "alliances_name_key" ON "alliances"("name");

-- CreateIndex
CREATE UNIQUE INDEX "alliance_members_allianceId_userId_key" ON "alliance_members"("allianceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "spaces_level_key" ON "spaces"("level");

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");
