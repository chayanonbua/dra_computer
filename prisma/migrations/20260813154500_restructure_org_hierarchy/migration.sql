-- Restructure ownership into a 3-level hierarchy: Office > Group > Person
-- Bureau is renamed to Office (data preserved). Owner is removed: assets now
-- attach directly to a Group or a Person via Asset.currentGroupId /
-- Asset.currentPersonId (exactly one, or both null if unassigned).
--
-- This is a destructive migration for the Owner/Bureau data specifically —
-- existing sample data is recreated by the updated seed script afterward.

PRAGMA foreign_keys=OFF;

-- Rename Bureau -> Office (SQLite updates other tables' FK references automatically)
ALTER TABLE "Bureau" RENAME TO "Office";

-- Rename Group.bureauId -> Group.officeId (FK constraint definition updates with it)
ALTER TABLE "Group" RENAME COLUMN "bureauId" TO "officeId";

-- New Person table (บุคคล, ขึ้นกับกลุ่ม)
CREATE TABLE "Person" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Person_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Recreate Asset without currentOwnerId, with currentGroupId/currentPersonId instead.
-- SQLite cannot DROP COLUMN currentOwnerId directly: it is part of an inline
-- FOREIGN KEY constraint on this table, which SQLite's DROP COLUMN forbids.
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
    "currentGroupId" INTEGER,
    "currentPersonId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_currentGroupId_fkey" FOREIGN KEY ("currentGroupId") REFERENCES "Group" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_currentPersonId_fkey" FOREIGN KEY ("currentPersonId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Asset" ("id","assetNumber","name","brand","model","status","acquiredAt","note","disposedAt","disposalReason","currentGroupId","currentPersonId","createdAt","updatedAt")
SELECT "id","assetNumber","name","brand","model","status","acquiredAt","note","disposedAt","disposalReason",NULL,NULL,"createdAt","updatedAt" FROM "Asset";

DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_assetNumber_key" ON "Asset"("assetNumber");

-- Owner is replaced by direct Group/Person ownership
DROP TABLE "Owner";

PRAGMA foreign_keys=ON;
