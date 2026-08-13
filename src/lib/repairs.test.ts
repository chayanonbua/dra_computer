import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createRepair, validateCreateRepairInput } from "./repairs";

let assetId: number;
let disposedAssetId: number;

beforeAll(async () => {
  const asset = await prisma.asset.create({
    data: {
      assetNumber: "TEST-REPAIR-ASSET",
      name: "เครื่องทดสอบสำหรับ repairs.test.ts",
      status: "active",
    },
  });
  assetId = asset.id;

  const disposedAsset = await prisma.asset.create({
    data: {
      assetNumber: "TEST-REPAIR-DISPOSED-ASSET",
      name: "เครื่องทดสอบที่จำหน่ายแล้วสำหรับ repairs.test.ts",
      status: "disposed",
      disposedAt: new Date("2026-01-01"),
      disposalReason: "ชำรุด",
    },
  });
  disposedAssetId = disposedAsset.id;
});

afterAll(async () => {
  await prisma.repair.deleteMany({ where: { assetId: { in: [assetId, disposedAssetId] } } });
  await prisma.asset.deleteMany({ where: { id: { in: [assetId, disposedAssetId] } } });
});

describe("validateCreateRepairInput", () => {
  it("rejects a missing symptom", () => {
    expect(
      validateCreateRepairInput({
        assetId: 1,
        repairedAt: new Date(),
        symptom: "   ",
      })
    ).toBeTruthy();
  });

  it("rejects a negative cost", () => {
    expect(
      validateCreateRepairInput({
        assetId: 1,
        repairedAt: new Date(),
        symptom: "จอไม่ติด",
        cost: -100,
      })
    ).toBeTruthy();
  });

  it("rejects an invalid date", () => {
    expect(
      validateCreateRepairInput({
        assetId: 1,
        repairedAt: new Date("not-a-date"),
        symptom: "จอไม่ติด",
      })
    ).toBeTruthy();
  });

  it("accepts valid input", () => {
    expect(
      validateCreateRepairInput({
        assetId: 1,
        repairedAt: new Date(),
        symptom: "จอไม่ติด",
        cost: 100,
      })
    ).toBeNull();
  });
});

describe("createRepair", () => {
  it("creates a repair record for the given asset", async () => {
    const repair = await createRepair({
      assetId,
      repairedAt: new Date("2026-05-01"),
      symptom: "เครื่องดับเอง",
      solution: "เปลี่ยน power supply",
      cost: 1200,
      handledBy: "ช่างบี",
    });

    expect(repair.assetId).toBe(assetId);
    expect(repair.symptom).toBe("เครื่องดับเอง");
    expect(repair.solution).toBe("เปลี่ยน power supply");
    expect(repair.cost).toBe(1200);
    expect(repair.handledBy).toBe("ช่างบี");
  });

  it("defaults optional fields to null when omitted", async () => {
    const repair = await createRepair({
      assetId,
      repairedAt: new Date("2026-05-02"),
      symptom: "คีย์บอร์ดพัง",
    });

    expect(repair.solution).toBeNull();
    expect(repair.cost).toBeNull();
    expect(repair.handledBy).toBeNull();
  });

  it("throws and creates nothing when the asset does not exist", async () => {
    const before = await prisma.repair.count();

    await expect(
      createRepair({
        assetId: 999999,
        repairedAt: new Date(),
        symptom: "จอไม่ติด",
      })
    ).rejects.toThrow();

    const after = await prisma.repair.count();
    expect(after).toBe(before);
  });

  it("throws and creates nothing when the symptom is missing", async () => {
    const before = await prisma.repair.count();

    await expect(
      createRepair({
        assetId,
        repairedAt: new Date(),
        symptom: "",
      })
    ).rejects.toThrow();

    const after = await prisma.repair.count();
    expect(after).toBe(before);
  });

  it("throws and creates nothing when the asset has already been disposed", async () => {
    const before = await prisma.repair.count({ where: { assetId: disposedAssetId } });

    await expect(
      createRepair({
        assetId: disposedAssetId,
        repairedAt: new Date(),
        symptom: "จอไม่ติด",
      })
    ).rejects.toThrow();

    const after = await prisma.repair.count({ where: { assetId: disposedAssetId } });
    expect(after).toBe(before);
  });
});
