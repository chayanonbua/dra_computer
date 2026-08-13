import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { disposeAsset, validateDisposeAssetInput } from "./disposal";

let assetId: number;
let alreadyDisposedAssetId: number;

beforeAll(async () => {
  const asset = await prisma.asset.create({
    data: {
      assetNumber: "TEST-DISPOSAL-ASSET",
      name: "เครื่องทดสอบสำหรับ disposal.test.ts",
      status: "active",
    },
  });
  assetId = asset.id;

  const disposedAsset = await prisma.asset.create({
    data: {
      assetNumber: "TEST-DISPOSAL-ASSET-ALREADY",
      name: "เครื่องทดสอบที่จำหน่ายไปแล้ว",
      status: "disposed",
      disposedAt: new Date("2026-01-01"),
      disposalReason: "ชำรุด",
    },
  });
  alreadyDisposedAssetId = disposedAsset.id;
});

afterAll(async () => {
  await prisma.asset.deleteMany({
    where: { id: { in: [assetId, alreadyDisposedAssetId] } },
  });
});

describe("validateDisposeAssetInput", () => {
  it("rejects a missing reason", () => {
    expect(
      validateDisposeAssetInput({
        assetId: 1,
        disposedAt: new Date(),
        reason: "   ",
      })
    ).toBeTruthy();
  });

  it("rejects an invalid date", () => {
    expect(
      validateDisposeAssetInput({
        assetId: 1,
        disposedAt: new Date("not-a-date"),
        reason: "ชำรุด",
      })
    ).toBeTruthy();
  });

  it("accepts valid input", () => {
    expect(
      validateDisposeAssetInput({
        assetId: 1,
        disposedAt: new Date(),
        reason: "ชำรุด",
      })
    ).toBeNull();
  });
});

describe("disposeAsset", () => {
  it("sets status to disposed with the date and reason recorded", async () => {
    const result = await disposeAsset({
      assetId,
      disposedAt: new Date("2026-08-01"),
      reason: "เสื่อมสภาพ",
    });

    expect(result.status).toBe("disposed");
    expect(result.disposedAt?.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(result.disposalReason).toBe("เสื่อมสภาพ");

    const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    expect(asset.status).toBe("disposed");
    expect(asset.disposalReason).toBe("เสื่อมสภาพ");
  });

  it("throws when the asset does not exist", async () => {
    await expect(
      disposeAsset({
        assetId: 999999,
        disposedAt: new Date(),
        reason: "ชำรุด",
      })
    ).rejects.toThrow();
  });

  it("throws and does not overwrite existing disposal data when already disposed", async () => {
    await expect(
      disposeAsset({
        assetId: alreadyDisposedAssetId,
        disposedAt: new Date("2026-12-31"),
        reason: "เหตุผลใหม่ที่ไม่ควรถูกบันทึก",
      })
    ).rejects.toThrow();

    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: alreadyDisposedAssetId },
    });
    expect(asset.disposalReason).toBe("ชำรุด");
    expect(asset.disposedAt?.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("throws when the reason is missing", async () => {
    const freshAsset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-DISPOSAL-NO-REASON",
        name: "เครื่องทดสอบไม่มีเหตุผล",
        status: "active",
      },
    });

    try {
      await expect(
        disposeAsset({ assetId: freshAsset.id, disposedAt: new Date(), reason: "" })
      ).rejects.toThrow();

      const asset = await prisma.asset.findUniqueOrThrow({ where: { id: freshAsset.id } });
      expect(asset.status).toBe("active");
    } finally {
      await prisma.asset.delete({ where: { id: freshAsset.id } });
    }
  });
});
