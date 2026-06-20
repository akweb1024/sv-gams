-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "equipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slot" TEXT,
ADD COLUMN     "upgradeLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "className" TEXT,
ADD COLUMN     "dailyStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastDailyClaim" TIMESTAMP(3),
ADD COLUMN     "skillPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "shop_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "powerBonus" INTEGER NOT NULL DEFAULT 0,
    "healthBonus" INTEGER NOT NULL DEFAULT 0,
    "pricePoints" INTEGER NOT NULL DEFAULT 0,
    "priceCrystals" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "cost" INTEGER NOT NULL DEFAULT 1,
    "powerBonus" INTEGER NOT NULL DEFAULT 0,
    "healthBonus" INTEGER NOT NULL DEFAULT 0,
    "damageMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "requires" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "goalType" TEXT NOT NULL,
    "goalCount" INTEGER NOT NULL DEFAULT 1,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardCrystals" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "rewardSkillPoints" INTEGER NOT NULL DEFAULT 0,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "periodKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_items_name_key" ON "shop_items"("name");

-- CreateIndex
CREATE INDEX "shop_items_isActive_minLevel_idx" ON "shop_items"("isActive", "minLevel");

-- CreateIndex
CREATE UNIQUE INDEX "skills_key_key" ON "skills"("key");

-- CreateIndex
CREATE INDEX "skills_className_tier_idx" ON "skills"("className", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_userId_skillKey_key" ON "user_skills"("userId", "skillKey");

-- CreateIndex
CREATE UNIQUE INDEX "quests_key_key" ON "quests"("key");

-- CreateIndex
CREATE INDEX "quests_category_isActive_idx" ON "quests"("category", "isActive");

-- CreateIndex
CREATE INDEX "user_quests_userId_completed_claimed_idx" ON "user_quests"("userId", "completed", "claimed");

-- CreateIndex
CREATE UNIQUE INDEX "user_quests_userId_questId_periodKey_key" ON "user_quests"("userId", "questId", "periodKey");

-- CreateIndex
CREATE INDEX "activities_spaceLevel_isActive_idx" ON "activities"("spaceLevel", "isActive");

-- CreateIndex
CREATE INDEX "battles_battleType_winnerId_createdAt_idx" ON "battles"("battleType", "winnerId", "createdAt");

-- CreateIndex
CREATE INDEX "battles_attackerId_battleType_spaceLevel_idx" ON "battles"("attackerId", "battleType", "spaceLevel");

-- CreateIndex
CREATE INDEX "battles_battleType_attackerId_winnerId_spaceLevel_createdAt_idx" ON "battles"("battleType", "attackerId", "winnerId", "spaceLevel", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_items_userId_equipped_idx" ON "inventory_items"("userId", "equipped");

-- CreateIndex
CREATE INDEX "trades_senderId_status_idx" ON "trades"("senderId", "status");

-- CreateIndex
CREATE INDEX "trades_receiverId_status_idx" ON "trades"("receiverId", "status");

-- CreateIndex
CREATE INDEX "user_activities_userId_activityId_idx" ON "user_activities"("userId", "activityId");

-- CreateIndex
CREATE INDEX "user_activities_userId_completedAt_idx" ON "user_activities"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "users_points_level_idx" ON "users"("points", "level");

-- CreateIndex
CREATE INDEX "users_isNpc_spaceLevel_idx" ON "users"("isNpc", "spaceLevel");

-- CreateIndex
CREATE INDEX "users_isNpc_lastLogin_idx" ON "users"("isNpc", "lastLogin");

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quests" ADD CONSTRAINT "user_quests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data preservation: keep existing players' power by equipping their current gear.
-- Weapons/armor/artifacts become equipped; assign a slot for equip/unequip UI.
UPDATE "inventory_items" SET "slot" = CASE
    WHEN "itemType" = 'weapon' THEN 'weapon'
    WHEN "itemType" = 'armor' THEN 'armor'
    WHEN "itemType" IN ('artifact', 'accessory') THEN 'accessory'
    ELSE NULL
  END;
UPDATE "inventory_items" SET "equipped" = true WHERE "slot" IS NOT NULL;
