import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./prisma";
import {
  ASSET_STATUS_LABELS,
  buildAssetTimeline,
  filterAssets,
  formatOwnerDisplayName,
  getAssetDetail,
  getAssetListItems,
  type AssetListItem,
  type MovementRecord,
  type RepairRecord,
} from "./assets";

const assets: AssetListItem[] = [
  {
    id: 1,
    assetNumber: "COMP-2024-001",
    name: "คอมพิวเตอร์ตั้งโต๊ะ",
    brand: "Dell",
    model: "OptiPlex 7010",
    status: "active",
    currentOwnerName: "กลุ่มการเงินและบัญชี",
    currentOwnerLevel: "group",
    currentOwnerGroupName: "กลุ่มการเงินและบัญชี",
    currentOwnerOfficeName: "สำนักงานเลขานุการกรม",
  },
  {
    id: 2,
    assetNumber: "COMP-2024-002",
    name: "โน้ตบุ๊ก",
    brand: "Lenovo",
    model: "ThinkPad T14",
    status: "repairing",
    currentOwnerName: "สมชาย ใจดี",
    currentOwnerLevel: "person",
    currentOwnerGroupName: "กลุ่มการเจ้าหน้าที่",
    currentOwnerOfficeName: "สำนักงานเลขานุการกรม",
  },
  {
    id: 3,
    assetNumber: "COMP-2022-015",
    name: "เครื่องพิมพ์",
    brand: "HP",
    model: "LaserJet Pro M404dn",
    status: "active",
    currentOwnerName: "กลุ่มพัฒนาระบบ",
    currentOwnerLevel: "group",
    currentOwnerGroupName: "กลุ่มพัฒนาระบบ",
    currentOwnerOfficeName: "สำนักเทคโนโลยีสารสนเทศ",
  },
  {
    id: 4,
    assetNumber: "COMP-2019-003",
    name: "เครื่องเซิร์ฟเวอร์",
    brand: "HPE",
    model: "ProLiant DL380",
    status: "disposed",
    currentOwnerName: null,
    currentOwnerLevel: null,
    currentOwnerGroupName: null,
    currentOwnerOfficeName: null,
  },
];

describe("filterAssets", () => {
  it("returns all assets when no filters are given", () => {
    expect(filterAssets(assets, {})).toHaveLength(4);
  });

  it("filters by status", () => {
    const result = filterAssets(assets, { status: "active" });
    expect(result.map((a) => a.assetNumber)).toEqual([
      "COMP-2024-001",
      "COMP-2022-015",
    ]);
  });

  it("filters by status: repairing", () => {
    const result = filterAssets(assets, { status: "repairing" });
    expect(result).toHaveLength(1);
    expect(result[0].assetNumber).toBe("COMP-2024-002");
  });

  it("returns everything when status filter is an empty string", () => {
    expect(filterAssets(assets, { status: "" })).toHaveLength(4);
  });

  it("filters by exact group name", () => {
    const result = filterAssets(assets, { group: "กลุ่มการเงินและบัญชี" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("filters by exact office name, matching multiple assets that share it", () => {
    const result = filterAssets(assets, { office: "สำนักงานเลขานุการกรม" });
    expect(result.map((a) => a.id).sort()).toEqual([1, 2]);
  });

  it("excludes assets with no group when a group filter is set", () => {
    const result = filterAssets(assets, { group: "กลุ่มการเงินและบัญชี" });
    expect(result.some((a) => a.id === 4)).toBe(false);
  });

  it("combines group and office filters with status (AND logic)", () => {
    const result = filterAssets(assets, {
      office: "สำนักงานเลขานุการกรม",
      status: "repairing",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("returns everything when group/office filters are empty strings", () => {
    expect(filterAssets(assets, { group: "", office: "" })).toHaveLength(4);
  });

  it("searches by asset number, case-insensitively", () => {
    const result = filterAssets(assets, { search: "comp-2024-001" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("searches by name", () => {
    const result = filterAssets(assets, { search: "โน้ตบุ๊ก" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("searches by brand/model", () => {
    const result = filterAssets(assets, { search: "thinkpad" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("searches by current owner name (a person, distinct from their group name)", () => {
    const result = filterAssets(assets, { search: "สมชาย ใจดี" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("searches by current owner's group name", () => {
    const result = filterAssets(assets, { search: "กลุ่มพัฒนาระบบ" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("searches by current owner's office name", () => {
    const result = filterAssets(assets, { search: "สำนักเทคโนโลยีสารสนเทศ" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it("does not crash searching assets with no current owner", () => {
    const result = filterAssets(assets, { search: "เซิร์ฟเวอร์" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it("combines search and status filters (AND logic)", () => {
    const result = filterAssets(assets, { search: "comp", status: "disposed" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it("returns an empty list when nothing matches", () => {
    const result = filterAssets(assets, { search: "ไม่มีทางเจอ" });
    expect(result).toHaveLength(0);
  });
});

describe("formatOwnerDisplayName", () => {
  it('ตัดคำนำหน้า "กลุ่ม" ออกจากชื่อกลุ่ม', () => {
    expect(formatOwnerDisplayName("กลุ่มการคลัง")).toBe("การคลัง");
  });

  it('ตัดคำนำหน้า "บุคคล" ออก ถ้ามีนำหน้าชื่อ', () => {
    expect(formatOwnerDisplayName("บุคคลสมชาย ใจดี")).toBe("สมชาย ใจดี");
  });

  it("ไม่ตัดอะไรออกถ้าชื่อไม่ได้ขึ้นต้นด้วยคำเหล่านี้ (เช่น ชื่อบุคคลทั่วไปหรือชื่อสำนัก)", () => {
    expect(formatOwnerDisplayName("นางฉวีวรรณ วงค์ศรี")).toBe("นางฉวีวรรณ วงค์ศรี");
    expect(formatOwnerDisplayName("สำนักงานเลขานุการกรม")).toBe("สำนักงานเลขานุการกรม");
    expect(formatOwnerDisplayName("ฝ่ายบริหารทั่วไป")).toBe("ฝ่ายบริหารทั่วไป");
  });

  it("ไม่ตัดคำที่ขึ้นต้นคล้ายกันแต่ไม่ใช่คำเต็ม (เช่น กลุ่มงาน... ยังคงคำว่ากลุ่มไว้ตามชื่อจริง)", () => {
    // "กลุ่มงานเลขานุการ..." -> ตัด "กลุ่ม" นำหน้าออกเหลือ "งานเลขานุการ..." ตามกติกาเดียวกัน
    expect(formatOwnerDisplayName("กลุ่มงานเลขานุการคณะกรรมการส่งเสริมคุณธรรมแห่งชาติ")).toBe(
      "งานเลขานุการคณะกรรมการส่งเสริมคุณธรรมแห่งชาติ"
    );
  });
});

describe("buildAssetTimeline", () => {
  const repairs: RepairRecord[] = [
    {
      id: 1,
      repairedAt: new Date("2026-03-01"),
      symptom: "จอไม่ติด",
      solution: "เปลี่ยนสายไฟ",
      cost: 500,
      handledBy: "ช่างเอ",
    },
    {
      id: 2,
      repairedAt: new Date("2026-01-10"),
      symptom: "เครื่องร้อนจัด",
      solution: null,
      cost: null,
      handledBy: null,
    },
  ];

  const movements: MovementRecord[] = [
    {
      id: 1,
      movedAt: new Date("2026-02-15"),
      fromOwner: "ฝ่ายบัญชี",
      toOwner: "ฝ่ายไอที",
      note: null,
    },
  ];

  it("merges repairs and movements sorted by date, latest first", () => {
    const timeline = buildAssetTimeline(repairs, movements);
    expect(timeline.map((entry) => entry.date.toISOString().slice(0, 10))).toEqual([
      "2026-03-01",
      "2026-02-15",
      "2026-01-10",
    ]);
  });

  it("labels each entry with its correct type", () => {
    const timeline = buildAssetTimeline(repairs, movements);
    expect(timeline.map((entry) => entry.type)).toEqual([
      "repair",
      "movement",
      "repair",
    ]);
  });

  it("returns an empty timeline when there is no history", () => {
    expect(buildAssetTimeline([], [])).toEqual([]);
  });

  it("handles repairs-only history", () => {
    const timeline = buildAssetTimeline(repairs, []);
    expect(timeline).toHaveLength(2);
    expect(timeline.every((entry) => entry.type === "repair")).toBe(true);
  });

  it("handles movements-only history", () => {
    const timeline = buildAssetTimeline([], movements);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].type).toBe("movement");
  });

  it("merges a disposal entry in with repairs and movements, sorted by date", () => {
    const timeline = buildAssetTimeline(repairs, movements, {
      disposedAt: new Date("2026-04-01"),
      reason: "ครบอายุการใช้งาน",
    });
    expect(timeline.map((entry) => entry.type)).toEqual([
      "disposal",
      "repair",
      "movement",
      "repair",
    ]);
  });

  it("omits the disposal entry when the asset has not been disposed", () => {
    const timeline = buildAssetTimeline(repairs, movements, null);
    expect(timeline.some((entry) => entry.type === "disposal")).toBe(false);
  });
});

// getAssetListItems/getAssetDetail ใช้ fixture ของตัวเอง (ไม่พึ่ง seed data ที่มีอยู่ในระบบ)
// เพราะข้อมูลจริงในฐานข้อมูลอาจเปลี่ยนแปลงได้ตลอดเวลา (เช่น นำเข้าข้อมูลบุคลากรจริง)
describe("DB-backed asset queries", () => {
  let officeId: number;
  let groupId: number;
  let personId: number;
  let officeName: string;
  let groupName: string;
  let personName: string;

  let groupOwnedAssetId: number;
  let personOwnedAssetId: number;
  let movedAssetId: number;
  let disposedAssetId: number;

  beforeAll(async () => {
    const office = await prisma.office.create({ data: { name: "สำนักทดสอบ assets.test.ts" } });
    officeId = office.id;
    officeName = office.name;

    const group = await prisma.group.create({
      data: { name: "กลุ่มทดสอบ assets.test.ts", officeId },
    });
    groupId = group.id;
    groupName = group.name;

    const person = await prisma.person.create({
      data: { name: "บุคคลทดสอบ assets.test.ts", groupId },
    });
    personId = person.id;
    personName = person.name;

    const groupOwnedAsset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-ASSETS-GROUP-OWNED",
        name: "เครื่องทดสอบกลุ่มถือครอง",
        status: "active",
        currentGroupId: groupId,
      },
    });
    groupOwnedAssetId = groupOwnedAsset.id;

    const personOwnedAsset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-ASSETS-PERSON-OWNED",
        name: "เครื่องทดสอบบุคคลถือครอง",
        status: "repairing",
        currentPersonId: personId,
      },
    });
    personOwnedAssetId = personOwnedAsset.id;
    await prisma.repair.create({
      data: { assetId: personOwnedAssetId, repairedAt: new Date("2026-05-01"), symptom: "ทดสอบ" },
    });

    const movedAsset = await prisma.asset.create({
      data: { assetNumber: "TEST-ASSETS-MOVED", name: "เครื่องทดสอบมีประวัติย้าย", status: "active" },
    });
    movedAssetId = movedAsset.id;
    await prisma.movement.create({
      data: { assetId: movedAssetId, movedAt: new Date("2026-05-02"), fromOwner: null, toOwner: groupName },
    });

    const disposedAsset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-ASSETS-DISPOSED",
        name: "เครื่องทดสอบจำหน่ายแล้ว",
        status: "disposed",
        disposedAt: new Date("2026-02-01"),
        disposalReason: "ครบอายุการใช้งาน",
      },
    });
    disposedAssetId = disposedAsset.id;
  });

  afterAll(async () => {
    const assetIds = [groupOwnedAssetId, personOwnedAssetId, movedAssetId, disposedAssetId];
    await prisma.repair.deleteMany({ where: { assetId: { in: assetIds } } });
    await prisma.movement.deleteMany({ where: { assetId: { in: assetIds } } });
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
    await prisma.person.delete({ where: { id: personId } });
    await prisma.group.delete({ where: { id: groupId } });
    await prisma.office.delete({ where: { id: officeId } });
  });

  describe("getAssetListItems", () => {
    it("resolves owner/group/office name from a group that directly holds the asset", async () => {
      const items = await getAssetListItems();
      const asset = items.find((a) => a.id === groupOwnedAssetId);
      expect(asset?.currentOwnerName).toBe(groupName);
      expect(asset?.currentOwnerGroupName).toBe(groupName);
      expect(asset?.currentOwnerOfficeName).toBe(officeName);
    });

    it("still includes disposed assets, labeled with the disposed status", async () => {
      const items = await getAssetListItems();
      const asset = items.find((a) => a.id === disposedAssetId);
      expect(asset).toBeDefined();
      expect(asset?.status).toBe("disposed");
      expect(ASSET_STATUS_LABELS.disposed).toBe("จำหน่าย");
    });

    it("returns null group/office for an asset with no current owner", async () => {
      const items = await getAssetListItems();
      const asset = items.find((a) => a.id === disposedAssetId);
      expect(asset?.currentOwnerName).toBeNull();
      expect(asset?.currentOwnerGroupName).toBeNull();
      expect(asset?.currentOwnerOfficeName).toBeNull();
    });
  });

  describe("getAssetDetail", () => {
    it("returns full detail with a repair-only timeline for the requested asset", async () => {
      const detail = await getAssetDetail(personOwnedAssetId);
      expect(detail).not.toBeNull();
      expect(detail?.assetNumber).toBe("TEST-ASSETS-PERSON-OWNED");
      expect(detail?.timeline).toHaveLength(1);
      expect(detail?.timeline[0].type).toBe("repair");
    });

    it("resolves owner/group/office name from a person who holds the asset", async () => {
      const detail = await getAssetDetail(personOwnedAssetId);
      expect(detail?.currentOwnerName).toBe(personName);
      expect(detail?.currentOwnerGroupName).toBe(groupName);
      expect(detail?.currentOwnerOfficeName).toBe(officeName);
    });

    it("returns a movement-only timeline scoped to that asset, not other assets", async () => {
      const detail = await getAssetDetail(movedAssetId);
      expect(detail).not.toBeNull();
      expect(detail?.timeline).toHaveLength(1);
      expect(detail?.timeline[0].type).toBe("movement");
    });

    it("returns null group/office for an asset with no current owner", async () => {
      const detail = await getAssetDetail(disposedAssetId);
      expect(detail?.currentOwnerName).toBeNull();
      expect(detail?.currentOwnerGroupName).toBeNull();
      expect(detail?.currentOwnerOfficeName).toBeNull();
    });

    it("returns null for an asset id that does not exist", async () => {
      const result = await getAssetDetail(999999);
      expect(result).toBeNull();
    });

    it("includes disposal date/reason and a disposal entry in the timeline for a disposed asset", async () => {
      const detail = await getAssetDetail(disposedAssetId);
      expect(detail?.status).toBe("disposed");
      expect(detail?.disposedAt?.toISOString().slice(0, 10)).toBe("2026-02-01");
      expect(detail?.disposalReason).toBe("ครบอายุการใช้งาน");

      const disposalEntry = detail?.timeline.find((entry) => entry.type === "disposal");
      expect(disposalEntry).toBeDefined();
      expect(disposalEntry?.type === "disposal" && disposalEntry.reason).toBe(
        "ครบอายุการใช้งาน"
      );
    });
  });
});
