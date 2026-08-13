import { prisma } from "./prisma";

export const ASSET_STATUSES = ["active", "repairing", "disposed"] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "ใช้งาน",
  repairing: "ซ่อม",
  disposed: "จำหน่าย",
};

export const ASSET_STATUS_BADGE_CLASS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  repairing: "bg-yellow-100 text-yellow-800",
  disposed: "bg-gray-200 text-gray-600",
};

export interface AssetListItem {
  id: number;
  assetNumber: string;
  name: string;
  brand: string | null;
  model: string | null;
  status: string;
  currentOwnerName: string | null;
  currentOwnerGroupName: string | null;
  currentOwnerOfficeName: string | null;
}

interface OwnerHolder {
  currentGroup: { name: string; office: { name: string } } | null;
  currentPerson: { name: string; group: { name: string; office: { name: string } } } | null;
}

// ครุภัณฑ์ผูกกับ "กลุ่ม" หรือ "บุคคล" อย่างใดอย่างหนึ่ง — สรุปเป็นชื่อผู้ใช้งาน/กลุ่ม/สำนักเดียวกัน
// เพื่อให้ UI แสดงผลได้แบบเดียวกันไม่ว่าจะถือครองโดยกลุ่มหรือบุคคล
function resolveOwnerInfo(asset: OwnerHolder): {
  ownerName: string | null;
  groupName: string | null;
  officeName: string | null;
} {
  if (asset.currentPerson) {
    return {
      ownerName: asset.currentPerson.name,
      groupName: asset.currentPerson.group.name,
      officeName: asset.currentPerson.group.office.name,
    };
  }
  if (asset.currentGroup) {
    return {
      ownerName: asset.currentGroup.name,
      groupName: asset.currentGroup.name,
      officeName: asset.currentGroup.office.name,
    };
  }
  return { ownerName: null, groupName: null, officeName: null };
}

const OWNER_INCLUDE = {
  currentGroup: { include: { office: true } },
  currentPerson: { include: { group: { include: { office: true } } } },
} as const;

export async function getAssetListItems(): Promise<AssetListItem[]> {
  const assets = await prisma.asset.findMany({
    orderBy: { assetNumber: "asc" },
    include: OWNER_INCLUDE,
  });

  return assets.map((asset) => {
    const owner = resolveOwnerInfo(asset);
    return {
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      brand: asset.brand,
      model: asset.model,
      status: asset.status,
      currentOwnerName: owner.ownerName,
      currentOwnerGroupName: owner.groupName,
      currentOwnerOfficeName: owner.officeName,
    };
  });
}

export interface AssetFilters {
  search?: string;
  status?: string;
  group?: string;
  office?: string;
}

export function filterAssets(
  assets: AssetListItem[],
  filters: AssetFilters
): AssetListItem[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const status = filters.status?.trim() ?? "";
  const group = filters.group?.trim() ?? "";
  const office = filters.office?.trim() ?? "";

  return assets.filter((asset) => {
    if (status && asset.status !== status) return false;
    if (group && asset.currentOwnerGroupName !== group) return false;
    if (office && asset.currentOwnerOfficeName !== office) return false;

    if (!search) return true;

    const haystack = [
      asset.assetNumber,
      asset.name,
      asset.brand,
      asset.model,
      asset.currentOwnerName,
      asset.currentOwnerGroupName,
      asset.currentOwnerOfficeName,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}

export interface AssetDetail {
  id: number;
  assetNumber: string;
  name: string;
  brand: string | null;
  model: string | null;
  status: string;
  currentOwnerName: string | null;
  currentOwnerGroupName: string | null;
  currentOwnerOfficeName: string | null;
  acquiredAt: Date | null;
  note: string | null;
  disposedAt: Date | null;
  disposalReason: string | null;
  timeline: TimelineEntry[];
}

export interface RepairRecord {
  id: number;
  repairedAt: Date;
  symptom: string;
  solution: string | null;
  cost: number | null;
  handledBy: string | null;
}

export interface MovementRecord {
  id: number;
  movedAt: Date;
  fromOwner: string | null;
  toOwner: string;
  note: string | null;
}

export interface DisposalRecord {
  disposedAt: Date;
  reason: string | null;
}

export type TimelineEntry =
  | ({ type: "repair"; date: Date } & RepairRecord)
  | ({ type: "movement"; date: Date } & MovementRecord)
  | ({ type: "disposal"; date: Date } & DisposalRecord);

export function buildAssetTimeline(
  repairs: RepairRecord[],
  movements: MovementRecord[],
  disposal?: DisposalRecord | null
): TimelineEntry[] {
  const repairEntries: TimelineEntry[] = repairs.map((repair) => ({
    type: "repair",
    date: repair.repairedAt,
    ...repair,
  }));

  const movementEntries: TimelineEntry[] = movements.map((movement) => ({
    type: "movement",
    date: movement.movedAt,
    ...movement,
  }));

  const disposalEntries: TimelineEntry[] = disposal
    ? [{ type: "disposal", date: disposal.disposedAt, ...disposal }]
    : [];

  return [...repairEntries, ...movementEntries, ...disposalEntries].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}

export async function getAssetDetail(id: number): Promise<AssetDetail | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      ...OWNER_INCLUDE,
      repairs: true,
      movements: true,
    },
  });

  if (!asset) return null;

  const owner = resolveOwnerInfo(asset);

  return {
    id: asset.id,
    assetNumber: asset.assetNumber,
    name: asset.name,
    brand: asset.brand,
    model: asset.model,
    status: asset.status,
    currentOwnerName: owner.ownerName,
    currentOwnerGroupName: owner.groupName,
    currentOwnerOfficeName: owner.officeName,
    acquiredAt: asset.acquiredAt,
    note: asset.note,
    disposedAt: asset.disposedAt,
    disposalReason: asset.disposalReason,
    timeline: buildAssetTimeline(
      asset.repairs,
      asset.movements,
      asset.disposedAt ? { disposedAt: asset.disposedAt, reason: asset.disposalReason } : null
    ),
  };
}
