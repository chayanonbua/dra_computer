-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "acquiredAt" DATETIME,
    "note" TEXT,
    "disposedAt" DATETIME,
    "disposalReason" TEXT,
    "currentOfficeId" INTEGER,
    "currentGroupId" INTEGER,
    "currentPersonId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_currentOfficeId_fkey" FOREIGN KEY ("currentOfficeId") REFERENCES "Office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_currentGroupId_fkey" FOREIGN KEY ("currentGroupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_currentPersonId_fkey" FOREIGN KEY ("currentPersonId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("acquiredAt", "assetNumber", "brand", "createdAt", "currentGroupId", "currentPersonId", "disposalReason", "disposedAt", "id", "model", "name", "note", "status", "updatedAt") SELECT "acquiredAt", "assetNumber", "brand", "createdAt", "currentGroupId", "currentPersonId", "disposalReason", "disposedAt", "id", "model", "name", "note", "status", "updatedAt" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_assetNumber_key" ON "Asset"("assetNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
