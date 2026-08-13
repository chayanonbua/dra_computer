import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createMovement, validateCreateMovementInput } from "./movements";

let officeId: number;
let groupAId: number;
let groupBId: number;
let personAId: number;
let groupAName: string;
let groupBName: string;
let personAName: string;
let assetId: number;

beforeAll(async () => {
  const office = await prisma.office.create({ data: { name: "สำนักทดสอบ movements.test.ts" } });
  officeId = office.id;

  const [groupA, groupB] = await Promise.all([
    prisma.group.create({ data: { name: "กลุ่มทดสอบ ก", officeId } }),
    prisma.group.create({ data: { name: "กลุ่มทดสอบ ข", officeId } }),
  ]);
  groupAId = groupA.id;
  groupBId = groupB.id;
  groupAName = groupA.name;
  groupBName = groupB.name;

  const personA = await prisma.person.create({
    data: { name: "บุคคลทดสอบ ก", groupId: groupAId },
  });
  personAId = personA.id;
  personAName = personA.name;

  const asset = await prisma.asset.create({
    data: {
      assetNumber: "TEST-MOVEMENT-ASSET",
      name: "เครื่องทดสอบสำหรับ movements.test.ts",
      status: "active",
      currentGroupId: groupAId,
    },
  });
  assetId = asset.id;
});

afterAll(async () => {
  await prisma.movement.deleteMany({ where: { assetId } });
  await prisma.asset.delete({ where: { id: assetId } });
  await prisma.person.delete({ where: { id: personAId } });
  await prisma.group.deleteMany({ where: { id: { in: [groupAId, groupBId] } } });
  await prisma.office.delete({ where: { id: officeId } });
});

describe("validateCreateMovementInput", () => {
  it("rejects a missing destination id", () => {
    expect(
      validateCreateMovementInput({
        assetId: 1,
        movedAt: new Date(),
        toType: "group",
        toId: NaN,
      })
    ).toBeTruthy();
  });

  it("rejects an invalid destination type", () => {
    expect(
      validateCreateMovementInput({
        assetId: 1,
        movedAt: new Date(),
        // @ts-expect-error testing an invalid value on purpose
        toType: "department",
        toId: 1,
      })
    ).toBeTruthy();
  });

  it("rejects an invalid date", () => {
    expect(
      validateCreateMovementInput({
        assetId: 1,
        movedAt: new Date("not-a-date"),
        toType: "group",
        toId: 1,
      })
    ).toBeTruthy();
  });

  it("accepts valid input", () => {
    expect(
      validateCreateMovementInput({
        assetId: 1,
        movedAt: new Date(),
        toType: "group",
        toId: 1,
      })
    ).toBeNull();
  });
});

describe("createMovement", () => {
  it("moves the asset to a person and updates currentPersonId, clearing currentGroupId", async () => {
    const movement = await createMovement({
      assetId,
      movedAt: new Date("2026-06-01"),
      toType: "person",
      toId: personAId,
      note: "ย้ายทดสอบครั้งที่ 1: กลุ่ม -> บุคคล",
    });

    expect(movement.fromOwner).toBe(groupAName);
    expect(movement.toOwner).toBe(personAName);

    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.currentPersonId).toBe(personAId);
    expect(asset.currentGroupId).toBeNull();
  });

  it("captures the previous owner as fromOwner on the next move, not the original owner", async () => {
    // ต่อจากเทสก่อนหน้า เจ้าของปัจจุบันตอนนี้คือ personA แล้ว
    const movement = await createMovement({
      assetId,
      movedAt: new Date("2026-06-15"),
      toType: "group",
      toId: groupBId,
      note: "ย้ายทดสอบครั้งที่ 2: บุคคล -> กลุ่ม",
    });

    expect(movement.fromOwner).toBe(personAName);
    expect(movement.toOwner).toBe(groupBName);

    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.currentGroupId).toBe(groupBId);
    expect(asset.currentPersonId).toBeNull();
  });

  it("rolls back completely when the destination group does not exist: no movement row, owner unchanged", async () => {
    const assetBefore = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    const movementCountBefore = await prisma.movement.count({ where: { assetId } });

    await expect(
      createMovement({
        assetId,
        movedAt: new Date("2026-07-01"),
        toType: "group",
        toId: 999999,
      })
    ).rejects.toThrow();

    const assetAfter = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    const movementCountAfter = await prisma.movement.count({ where: { assetId } });

    expect(assetAfter.currentGroupId).toBe(assetBefore.currentGroupId);
    expect(assetAfter.currentPersonId).toBe(assetBefore.currentPersonId);
    expect(movementCountAfter).toBe(movementCountBefore);
  });

  it("rolls back completely when the destination person does not exist: no movement row, owner unchanged", async () => {
    const assetBefore = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    const movementCountBefore = await prisma.movement.count({ where: { assetId } });

    await expect(
      createMovement({
        assetId,
        movedAt: new Date("2026-07-01"),
        toType: "person",
        toId: 999999,
      })
    ).rejects.toThrow();

    const assetAfter = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    const movementCountAfter = await prisma.movement.count({ where: { assetId } });

    expect(assetAfter.currentGroupId).toBe(assetBefore.currentGroupId);
    expect(assetAfter.currentPersonId).toBe(assetBefore.currentPersonId);
    expect(movementCountAfter).toBe(movementCountBefore);
  });

  it("rolls back completely when the asset does not exist: no movement row is created anywhere", async () => {
    const movementCountBefore = await prisma.movement.count();

    await expect(
      createMovement({
        assetId: 999999,
        movedAt: new Date("2026-07-01"),
        toType: "group",
        toId: groupAId,
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
        toType: "group",
        toId: groupAId,
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
        currentGroupId: groupAId,
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
          toType: "group",
          toId: groupBId,
        })
      ).rejects.toThrow();

      const movementCountAfter = await prisma.movement.count({
        where: { assetId: disposedAsset.id },
      });
      const assetAfter = await prisma.asset.findUniqueOrThrow({
        where: { id: disposedAsset.id },
      });

      expect(movementCountAfter).toBe(movementCountBefore);
      expect(assetAfter.currentGroupId).toBe(groupAId);
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
        toType: "group",
        toId: groupAId,
      });

      expect(movement.fromOwner).toBeNull();
      expect(movement.toOwner).toBe(groupAName);
    } finally {
      await prisma.movement.deleteMany({ where: { assetId: ownerlessAsset.id } });
      await prisma.asset.delete({ where: { id: ownerlessAsset.id } });
    }
  });
});
