import { describe, it, expect } from "vitest";
import { prisma } from "./prisma";

describe("prisma client", () => {
  it("connects to the seeded database and reads assets", async () => {
    const assets = await prisma.asset.findMany();
    expect(assets.length).toBeGreaterThanOrEqual(4);
  });

  it("has a unique constraint on assetNumber", async () => {
    await expect(
      prisma.asset.create({
        data: { assetNumber: "COMP-2024-001", name: "ทดสอบซ้ำ" },
      })
    ).rejects.toThrow();
  });
});
