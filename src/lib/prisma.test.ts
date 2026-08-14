import { describe, it, expect } from "vitest";
import { prisma } from "./prisma";

describe("prisma client", () => {
  it("connects to the database and reads assets", async () => {
    const assets = await prisma.asset.findMany();
    expect(assets.length).toBeGreaterThanOrEqual(0);
  });

  it("has a unique constraint on assetNumber", async () => {
    const assetNumber = "PRISMA-TEST-UNIQUE-CONSTRAINT";
    const original = await prisma.asset.create({ data: { assetNumber, name: "ทดสอบ" } });

    try {
      await expect(
        prisma.asset.create({
          data: { assetNumber, name: "ทดสอบซ้ำ" },
        })
      ).rejects.toThrow();
    } finally {
      await prisma.asset.delete({ where: { id: original.id } });
    }
  });
});
