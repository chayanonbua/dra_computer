import { describe, it, expect } from "vitest";
import {
  ASSET_STATUS_LABELS,
  buildAssetTimeline,
  filterAssets,
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

describe("getAssetListItems", () => {
  it("resolves owner/group/office name from a group that directly holds the asset", async () => {
    const items = await getAssetListItems();
    const printer = items.find((a) => a.assetNumber === "COMP-2022-015");
    expect(printer?.currentOwnerName).toBe("กลุ่มพัฒนาระบบ");
    expect(printer?.currentOwnerGroupName).toBe("กลุ่มพัฒนาระบบ");
    expect(printer?.currentOwnerOfficeName).toBe("สำนักเทคโนโลยีสารสนเทศ");
  });

  it("still includes disposed assets, labeled with the disposed status", async () => {
    const items = await getAssetListItems();
    const server = items.find((a) => a.assetNumber === "COMP-2019-003");
    expect(server).toBeDefined();
    expect(server?.status).toBe("disposed");
    expect(ASSET_STATUS_LABELS.disposed).toBe("จำหน่าย");
  });

  it("returns null group/office for an asset with no current owner", async () => {
    const items = await getAssetListItems();
    const server = items.find((a) => a.assetNumber === "COMP-2019-003");
    expect(server?.currentOwnerName).toBeNull();
    expect(server?.currentOwnerGroupName).toBeNull();
    expect(server?.currentOwnerOfficeName).toBeNull();
  });
});

describe("getAssetDetail", () => {
  it("returns full detail with a repair-only timeline for the requested asset", async () => {
    const laptop = await getAssetDetail(2);
    expect(laptop).not.toBeNull();
    expect(laptop?.assetNumber).toBe("COMP-2024-002");
    expect(laptop?.timeline).toHaveLength(1);
    expect(laptop?.timeline[0].type).toBe("repair");
  });

  it("resolves owner/group/office name from a person who holds the asset", async () => {
    const laptop = await getAssetDetail(2);
    expect(laptop?.currentOwnerName).toBe("สมชาย ใจดี");
    expect(laptop?.currentOwnerGroupName).toBe("กลุ่มการเจ้าหน้าที่");
    expect(laptop?.currentOwnerOfficeName).toBe("สำนักงานเลขานุการกรม");
  });

  it("returns a movement-only timeline scoped to that asset, not other assets", async () => {
    const desktop = await getAssetDetail(1);
    expect(desktop).not.toBeNull();
    expect(desktop?.assetNumber).toBe("COMP-2024-001");
    expect(desktop?.timeline).toHaveLength(1);
    expect(desktop?.timeline[0].type).toBe("movement");
  });

  it("returns null group/office for an asset with no current owner", async () => {
    const server = await getAssetDetail(4);
    expect(server?.currentOwnerName).toBeNull();
    expect(server?.currentOwnerGroupName).toBeNull();
    expect(server?.currentOwnerOfficeName).toBeNull();
  });

  it("returns null for an asset id that does not exist", async () => {
    const result = await getAssetDetail(999999);
    expect(result).toBeNull();
  });

  it("includes disposal date/reason and a disposal entry in the timeline for a disposed asset", async () => {
    const server = await getAssetDetail(4);
    expect(server?.status).toBe("disposed");
    expect(server?.disposedAt?.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(server?.disposalReason).toBe("ครบอายุการใช้งาน");

    const disposalEntry = server?.timeline.find((entry) => entry.type === "disposal");
    expect(disposalEntry).toBeDefined();
    expect(disposalEntry?.type === "disposal" && disposalEntry.reason).toBe(
      "ครบอายุการใช้งาน"
    );
  });
});
