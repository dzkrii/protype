-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "text" TEXT NOT NULL,
    "startTime" DATETIME,
    "hostId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "wpm" INTEGER NOT NULL DEFAULT 0,
    "finishedAt" DATETIME,
    CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
