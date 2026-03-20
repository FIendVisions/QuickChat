-- CreateTable
CREATE TABLE "channel_pins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "channel_pins_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "channel_pins_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "channel_pins_pinnedByUserId_fkey" FOREIGN KEY ("pinnedByUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_pins_channelId_messageId_key" ON "channel_pins"("channelId", "messageId");

-- CreateIndex
CREATE INDEX "channel_pins_channelId_idx" ON "channel_pins"("channelId");
