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

export type OwnerLevel = "office" | "group" | "person";

export const OWNER_LEVEL_LABELS: Record<OwnerLevel, string> = {
  office: "สำนัก",
  group: "กลุ่ม",
  person: "บุคคล",
};

// ตัดคำนำหน้า "กลุ่ม"/"บุคคล" ออกจากชื่อผู้ถือครอง สำหรับแสดงผลในที่ที่ไม่มีป้ายบอกระดับกำกับอยู่แล้ว
// (ชื่อกลุ่มในระบบส่วนใหญ่ขึ้นต้นด้วย "กลุ่ม" อยู่แล้ว เช่น "กลุ่มการคลัง" -> "การคลัง")
export function formatOwnerDisplayName(name: string): string {
  return name.replace(/^(กลุ่ม|บุคคล)\s*/, "");
}

export interface AssetListItem {
  id: number;
  assetNumber: string;
  name: string;
  brand: string | null;
  model: string | null;
  status: string;
  currentOwnerName: string | null;
  currentOwnerLevel: OwnerLevel | null;
  currentOwnerGroupName: string | null;
  currentOwnerOfficeName: string | null;
}

interface OwnerHolder {
  currentOffice: { id: number; name: string } | null;
  currentGroup: { id: number; name: string; office: { name: string } } | null;
  currentPerson: {
    id: number;
    name: string;
    group: { name: string; office: { name: string } };
  } | null;
}

// ครุภัณฑ์ผูกกับ "สำนัก", "กลุ่ม" หรือ "บุคคล" ระดับใดระดับหนึ่ง — สรุปเป็นชื่อผู้ถือครอง/กลุ่ม/สำนักเดียวกัน
// เพื่อให้ UI แสดงผลได้แบบเดียวกันไม่ว่าจะถือครองโดยระดับใด
function resolveOwnerInfo(asset: OwnerHolder): {
  ownerId: number | null;
  ownerName: string | null;
  ownerLevel: OwnerLevel | null;
  groupName: string | null;
  officeName: string | null;
} {
  if (asset.currentPerson) {
    return {
      ownerId: asset.currentPerson.id,
      ownerName: asset.currentPerson.name,
      ownerLevel: "person",
      groupName: asset.currentPerson.group.name,
      officeName: asset.currentPerson.group.office.name,
    };
  }
  if (asset.currentGroup) {
    return {
      ownerId: asset.currentGroup.id,
      ownerName: asset.currentGroup.name,
      ownerLevel: "group",
      groupName: asset.currentGroup.name,
      officeName: asset.currentGroup.office.name,
    };
  }
  if (asset.currentOffice) {
    return {
      ownerId: asset.currentOffice.id,
      ownerName: asset.currentOffice.name,
      ownerLevel: "office",
      groupName: null,
      officeName: asset.currentOffice.name,
    };
  }
  return { ownerId: null, ownerName: null, ownerLevel: null, groupName: null, officeName: null };
}

const OWNER_INCLUDE = {
  currentOffice: true,
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
      currentOwnerLevel: owner.ownerLevel,
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
  currentOwnerId: number | null;
  currentOwnerName: string | null;
  currentOwnerLevel: OwnerLevel | null;
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
    currentOwnerId: owner.ownerId,
    currentOwnerName: owner.ownerName,
    currentOwnerLevel: owner.ownerLevel,
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

export interface AssetOwnerAssignment {
  level: OwnerLevel;
  id: number;
}

export interface AssetInput {
  assetNumber: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  status: string;
  acquiredAt?: Date | null;
  note?: string | null;
  owner?: AssetOwnerAssignment | null;
}

export function validateAssetInput(input: AssetInput): string | null {
  if (!input.assetNumber || !input.assetNumber.trim()) return "กรุณาระบุหมายเลขครุภัณฑ์";
  if (!input.name || !input.name.trim()) return "กรุณาระบุชื่อ/ประเภทครุภัณฑ์";
  if (!(ASSET_STATUSES as readonly string[]).includes(input.status)) return "สถานะไม่ถูกต้อง";
  if (input.acquiredAt && Number.isNaN(input.acquiredAt.getTime())) {
    return "กรุณาระบุวันที่ได้มาให้ถูกต้อง";
  }
  if (input.owner && !Number.isInteger(input.owner.id)) return "กรุณาเลือกผู้ถือครองให้ถูกต้อง";
  return null;
}

function ownerAssignmentToAssetData(owner: AssetOwnerAssignment | null | undefined) {
  return {
    currentOfficeId: owner?.level === "office" ? owner.id : null,
    currentGroupId: owner?.level === "group" ? owner.id : null,
    currentPersonId: owner?.level === "person" ? owner.id : null,
  };
}

async function assertOwnerExists(owner: AssetOwnerAssignment | null | undefined) {
  if (!owner) return;
  if (owner.level === "office") {
    const office = await prisma.office.findUnique({ where: { id: owner.id } });
    if (!office) throw new Error("ไม่พบสำนักที่เลือกเป็นผู้ถือครอง");
  } else if (owner.level === "group") {
    const group = await prisma.group.findUnique({ where: { id: owner.id } });
    if (!group) throw new Error("ไม่พบกลุ่มที่เลือกเป็นผู้ถือครอง");
  } else {
    const person = await prisma.person.findUnique({ where: { id: owner.id } });
    if (!person) throw new Error("ไม่พบบุคคลที่เลือกเป็นผู้ถือครอง");
  }
}

export async function createAsset(input: AssetInput) {
  const validationError = validateAssetInput(input);
  if (validationError) throw new Error(validationError);

  const assetNumber = input.assetNumber.trim();
  const existing = await prisma.asset.findUnique({ where: { assetNumber } });
  if (existing) {
    throw new Error(`หมายเลขครุภัณฑ์ "${assetNumber}" มีอยู่ในระบบแล้ว กรุณาใช้หมายเลขอื่น`);
  }

  await assertOwnerExists(input.owner);

  return prisma.asset.create({
    data: {
      assetNumber,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      status: input.status,
      acquiredAt: input.acquiredAt ?? null,
      note: input.note?.trim() || null,
      ...ownerAssignmentToAssetData(input.owner),
    },
  });
}

export async function updateAsset(id: number, input: AssetInput) {
  const validationError = validateAssetInput(input);
  if (validationError) throw new Error(validationError);

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) throw new Error("ไม่พบครุภัณฑ์ที่ต้องการแก้ไข");

  const assetNumber = input.assetNumber.trim();
  const duplicate = await prisma.asset.findFirst({ where: { assetNumber, NOT: { id } } });
  if (duplicate) {
    throw new Error(`หมายเลขครุภัณฑ์ "${assetNumber}" มีอยู่ในระบบแล้ว กรุณาใช้หมายเลขอื่น`);
  }

  await assertOwnerExists(input.owner);

  return prisma.asset.update({
    where: { id },
    data: {
      assetNumber,
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      status: input.status,
      acquiredAt: input.acquiredAt ?? null,
      note: input.note?.trim() || null,
      ...ownerAssignmentToAssetData(input.owner),
    },
  });
}
