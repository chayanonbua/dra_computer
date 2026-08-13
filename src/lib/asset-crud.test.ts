import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createAsset, updateAsset, validateAssetInput } from "./assets";

let officeId: number;
let groupId: number;
let personId: number;
const createdAssetIds: number[] = [];

beforeAll(async () => {
  const office = await prisma.office.create({ data: { name: "สำนักทดสอบ asset-crud.test.ts" } });
  officeId = office.id;

  const group = await prisma.group.create({
    data: { name: "กลุ่มทดสอบ asset-crud.test.ts", officeId },
  });
  groupId = group.id;

  const person = await prisma.person.create({
    data: { name: "บุคคลทดสอบ asset-crud.test.ts", groupId },
  });
  personId = person.id;
});

afterAll(async () => {
  if (createdAssetIds.length) {
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
  }
  await prisma.person.delete({ where: { id: personId } });
  await prisma.group.delete({ where: { id: groupId } });
  await prisma.office.delete({ where: { id: officeId } });
});

describe("validateAssetInput", () => {
  it("rejects a missing asset number", () => {
    expect(
      validateAssetInput({ assetNumber: "  ", name: "คอมพิวเตอร์", status: "active" })
    ).toBeTruthy();
  });

  it("rejects a missing name", () => {
    expect(
      validateAssetInput({ assetNumber: "X-001", name: "", status: "active" })
    ).toBeTruthy();
  });

  it("rejects an invalid status", () => {
    expect(
      validateAssetInput({ assetNumber: "X-001", name: "คอมพิวเตอร์", status: "unknown" })
    ).toBeTruthy();
  });

  it("accepts valid input with no owner", () => {
    expect(
      validateAssetInput({ assetNumber: "X-001", name: "คอมพิวเตอร์", status: "active" })
    ).toBeNull();
  });
});

describe("createAsset", () => {
  it("creates a new asset successfully", async () => {
    const asset = await createAsset({
      assetNumber: "TEST-CRUD-001",
      name: "คอมพิวเตอร์ตั้งโต๊ะทดสอบ",
      brand: "Dell",
      model: "OptiPlex",
      status: "active",
      acquiredAt: new Date("2026-01-01"),
      note: "ทดสอบเพิ่มครุภัณฑ์",
      owner: null,
    });
    createdAssetIds.push(asset.id);

    expect(asset.assetNumber).toBe("TEST-CRUD-001");
    expect(asset.name).toBe("คอมพิวเตอร์ตั้งโต๊ะทดสอบ");
    expect(asset.status).toBe("active");
  });

  it("prevents creating an asset with a duplicate asset number", async () => {
    const first = await createAsset({
      assetNumber: "TEST-CRUD-DUP",
      name: "เครื่องแรก",
      status: "active",
    });
    createdAssetIds.push(first.id);

    await expect(
      createAsset({ assetNumber: "TEST-CRUD-DUP", name: "เครื่องที่สอง", status: "active" })
    ).rejects.toThrow(/มีอยู่ในระบบแล้ว/);

    // ยืนยันว่าไม่มีการสร้างแถวซ้ำจริง
    const count = await prisma.asset.count({ where: { assetNumber: "TEST-CRUD-DUP" } });
    expect(count).toBe(1);
  });

  it("prevents creating an asset with an empty asset number", async () => {
    await expect(
      createAsset({ assetNumber: "   ", name: "เครื่องไม่มีหมายเลข", status: "active" })
    ).rejects.toThrow();
  });

  it("can be owned directly by an office", async () => {
    const asset = await createAsset({
      assetNumber: "TEST-CRUD-OFFICE-OWNER",
      name: "เครื่องทดสอบเจ้าของระดับสำนัก",
      status: "active",
      owner: { level: "office", id: officeId },
    });
    createdAssetIds.push(asset.id);

    expect(asset.currentOfficeId).toBe(officeId);
    expect(asset.currentGroupId).toBeNull();
    expect(asset.currentPersonId).toBeNull();
  });

  it("can be owned directly by a group", async () => {
    const asset = await createAsset({
      assetNumber: "TEST-CRUD-GROUP-OWNER",
      name: "เครื่องทดสอบเจ้าของระดับกลุ่ม",
      status: "active",
      owner: { level: "group", id: groupId },
    });
    createdAssetIds.push(asset.id);

    expect(asset.currentGroupId).toBe(groupId);
    expect(asset.currentOfficeId).toBeNull();
    expect(asset.currentPersonId).toBeNull();
  });

  it("can be owned directly by a person", async () => {
    const asset = await createAsset({
      assetNumber: "TEST-CRUD-PERSON-OWNER",
      name: "เครื่องทดสอบเจ้าของระดับบุคคล",
      status: "active",
      owner: { level: "person", id: personId },
    });
    createdAssetIds.push(asset.id);

    expect(asset.currentPersonId).toBe(personId);
    expect(asset.currentOfficeId).toBeNull();
    expect(asset.currentGroupId).toBeNull();
  });

  it("rejects an owner assignment pointing at an office/group/person that does not exist", async () => {
    await expect(
      createAsset({
        assetNumber: "TEST-CRUD-BAD-OWNER",
        name: "เครื่องเจ้าของไม่มีจริง",
        status: "active",
        owner: { level: "group", id: 999999 },
      })
    ).rejects.toThrow();
  });
});

describe("updateAsset", () => {
  it("updates an existing asset's data correctly", async () => {
    const asset = await createAsset({
      assetNumber: "TEST-CRUD-UPDATE",
      name: "ชื่อเดิม",
      brand: "HP",
      status: "active",
    });
    createdAssetIds.push(asset.id);

    const updated = await updateAsset(asset.id, {
      assetNumber: "TEST-CRUD-UPDATE",
      name: "ชื่อใหม่",
      brand: "Lenovo",
      model: "ThinkCentre",
      status: "repairing",
      note: "แก้ไขแล้ว",
    });

    expect(updated.name).toBe("ชื่อใหม่");
    expect(updated.brand).toBe("Lenovo");
    expect(updated.model).toBe("ThinkCentre");
    expect(updated.status).toBe("repairing");
    expect(updated.note).toBe("แก้ไขแล้ว");
  });

  it("changes the owner level via edit, from unassigned to a person", async () => {
    const asset = await createAsset({
      assetNumber: "TEST-CRUD-UPDATE-OWNER",
      name: "เครื่องทดสอบเปลี่ยนเจ้าของ",
      status: "active",
    });
    createdAssetIds.push(asset.id);
    expect(asset.currentPersonId).toBeNull();

    const updated = await updateAsset(asset.id, {
      assetNumber: "TEST-CRUD-UPDATE-OWNER",
      name: "เครื่องทดสอบเปลี่ยนเจ้าของ",
      status: "active",
      owner: { level: "person", id: personId },
    });

    expect(updated.currentPersonId).toBe(personId);
  });

  it("prevents updating an asset number to one that already belongs to another asset", async () => {
    const assetA = await createAsset({
      assetNumber: "TEST-CRUD-A",
      name: "เครื่อง A",
      status: "active",
    });
    createdAssetIds.push(assetA.id);
    const assetB = await createAsset({
      assetNumber: "TEST-CRUD-B",
      name: "เครื่อง B",
      status: "active",
    });
    createdAssetIds.push(assetB.id);

    await expect(
      updateAsset(assetB.id, { assetNumber: "TEST-CRUD-A", name: "เครื่อง B", status: "active" })
    ).rejects.toThrow(/มีอยู่ในระบบแล้ว/);

    const stillB = await prisma.asset.findUniqueOrThrow({ where: { id: assetB.id } });
    expect(stillB.assetNumber).toBe("TEST-CRUD-B");
  });

  it("allows keeping an asset's own asset number unchanged when editing other fields", async () => {
    const asset = await createAsset({
      assetNumber: "TEST-CRUD-SELF",
      name: "เครื่องเดิม",
      status: "active",
    });
    createdAssetIds.push(asset.id);

    await expect(
      updateAsset(asset.id, { assetNumber: "TEST-CRUD-SELF", name: "เครื่องแก้ไขชื่อ", status: "active" })
    ).resolves.toBeDefined();
  });

  it("throws when the asset does not exist", async () => {
    await expect(
      updateAsset(999999, { assetNumber: "X", name: "X", status: "active" })
    ).rejects.toThrow();
  });
});
