import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createMovement, validateCreateMovementInput } from "./movements";

let assetId: number;
let ownerAId: number;
let ownerBId: number;
let ownerAName: string;
let ownerBName: string;

beforeAll(async () => {
  const [ownerA, ownerB] = await Promise.all([
    prisma.owner.create({ data: { name: "เจ้าของทดสอบ ก", type: "person" } }),
    prisma.owner.create({ data: { name: "เจ้าของทดสอบ ข", type: "person" } }),
  ]);
  ownerAId = ownerA.id;
  ownerBId = ownerB.id;
  ownerAName = ownerA.name;
  ownerBName = ownerB.name;

  const asset = await prisma.asset.create({
    data: {
      assetNumber: "TEST-MOVEMENT-ASSET",
      name: "เครื่องทดสอบสำหรับ movements.test.ts",
      status: "active",
      currentOwnerId: ownerAId,
    },
  });
  assetId = asset.id;
});

afterAll(async () => {
  await prisma.movement.deleteMany({ where: { assetId } });
  await prisma.asset.delete({ where: { id: assetId } });
  await prisma.owner.deleteMany({ where: { id: { in: [ownerAId, ownerBId] } } });
});

describe("validateCreateMovementInput", () => {
  it("rejects a missing destination", () => {
    expect(
      validateCreateMovementInput({
        assetId: 1,
        movedAt: new Date(),
        toOwnerId: NaN,
      })
    ).toBeTruthy();
  });

  it("rejects an invalid date", () => {
    expect(
      validateCreateMovementInput({
        assetId: 1,
        movedAt: new Date("not-a-date"),
        toOwnerId: 1,
      })
    ).toBeTruthy();
  });

  it("accepts valid input", () => {
    expect(
      validateCreateMovementInput({
        assetId: 1,
        movedAt: new Date(),
        toOwnerId: 1,
      })
    ).toBeNull();
  });
});

describe("createMovement", () => {
  it("moves the asset to the destination owner and updates currentOwnerId", async () => {
    const movement = await createMovement({
      assetId,
      movedAt: new Date("2026-06-01"),
      toOwnerId: ownerBId,
      note: "ย้ายทดสอบครั้งที่ 1",
    });

    expect(movement.fromOwner).toBe(ownerAName);
    expect(movement.toOwner).toBe(ownerBName);

    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.currentOwnerId).toBe(ownerBId);
  });

  it("captures the previous owner as fromOwner on the next move, not the original owner", async () => {
    // ต่อจากเทสก่อนหน้า เจ้าของปัจจุบันตอนนี้คือ ownerB แล้ว
    const movement = await createMovement({
      assetId,
      movedAt: new Date("2026-06-15"),
      toOwnerId: ownerAId,
      note: "ย้ายทดสอบครั้งที่ 2 (ย้ายกลับ)",
    });

    expect(movement.fromOwner).toBe(ownerBName);
    expect(movement.toOwner).toBe(ownerAName);

    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.currentOwnerId).toBe(ownerAId);
  });

  it("rolls back completely when the destination owner does not exist: no movement row, currentOwnerId unchanged", async () => {
    const assetBefore = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    const movementCountBefore = await prisma.movement.count({ where: { assetId } });

    await expect(
      createMovement({
        assetId,
        movedAt: new Date("2026-07-01"),
        toOwnerId: 999999,
      })
    ).rejects.toThrow();

    const assetAfter = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    const movementCountAfter = await prisma.movement.count({ where: { assetId } });

    expect(assetAfter.currentOwnerId).toBe(assetBefore.currentOwnerId);
    expect(movementCountAfter).toBe(movementCountBefore);
  });

  it("rolls back completely when the asset does not exist: no movement row is created anywhere", async () => {
    const movementCountBefore = await prisma.movement.count();

    await expect(
      createMovement({
        assetId: 999999,
        movedAt: new Date("2026-07-01"),
        toOwnerId: ownerAId,
      })
    ).rejects.toThrow();

    const movementCountAfter = await prisma.movement.count();
    expect(movementCountAfter).toBe(movementCountBefore);
  });

  it("throws before writing anything when the date is invalid", async () => {
    const movementCountBefore = await prisma.movement.count({ where: { assetId } });

    await expect(
      createMovement({
        assetId,
        movedAt: new Date("not-a-date"),
        toOwnerId: ownerBId,
      })
    ).rejects.toThrow();

    const movementCountAfter = await prisma.movement.count({ where: { assetId } });
    expect(movementCountAfter).toBe(movementCountBefore);
  });

  it("throws and creates nothing when the asset has already been disposed", async () => {
    const disposedAsset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-MOVEMENT-DISPOSED-ASSET",
        name: "เครื่องทดสอบที่จำหน่ายแล้วสำหรับ movements.test.ts",
        status: "disposed",
        disposedAt: new Date("2026-01-01"),
        disposalReason: "ชำรุด",
        currentOwnerId: ownerAId,
      },
    });

    try {
      const movementCountBefore = await prisma.movement.count({
        where: { assetId: disposedAsset.id },
      });

      await expect(
        createMovement({
          assetId: disposedAsset.id,
          movedAt: new Date(),
          toOwnerId: ownerBId,
        })
      ).rejects.toThrow();

      const movementCountAfter = await prisma.movement.count({
        where: { assetId: disposedAsset.id },
      });
      const assetAfter = await prisma.asset.findUniqueOrThrow({
        where: { id: disposedAsset.id },
      });

      expect(movementCountAfter).toBe(movementCountBefore);
      expect(assetAfter.currentOwnerId).toBe(ownerAId);
    } finally {
      await prisma.movement.deleteMany({ where: { assetId: disposedAsset.id } });
      await prisma.asset.delete({ where: { id: disposedAsset.id } });
    }
  });

  it("records a null fromOwner when the asset previously had no owner", async () => {
    const ownerlessAsset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-MOVEMENT-ASSET-NO-OWNER",
        name: "เครื่องทดสอบไม่มีเจ้าของเดิม",
        status: "active",
      },
    });

    try {
      const movement = await createMovement({
        assetId: ownerlessAsset.id,
        movedAt: new Date("2026-06-01"),
        toOwnerId: ownerAId,
      });

      expect(movement.fromOwner).toBeNull();
      expect(movement.toOwner).toBe(ownerAName);
    } finally {
      await prisma.movement.deleteMany({ where: { assetId: ownerlessAsset.id } });
      await prisma.asset.delete({ where: { id: ownerlessAsset.id } });
    }
  });
});
