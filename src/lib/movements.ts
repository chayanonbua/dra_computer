import { prisma } from "./prisma";

export interface CreateMovementInput {
  assetId: number;
  movedAt: Date;
  toOwnerId: number;
  note?: string | null;
}

export function validateCreateMovementInput(input: CreateMovementInput): string | null {
  if (!Number.isInteger(input.assetId)) return "ไม่พบครุภัณฑ์ที่ต้องการย้าย";
  if (Number.isNaN(input.movedAt.getTime())) return "กรุณาระบุวันที่ให้ถูกต้อง";
  if (!Number.isInteger(input.toOwnerId)) return "กรุณาเลือกปลายทาง";
  return null;
}

// สร้างประวัติการเคลื่อนย้าย + อัปเดต Asset.currentOwnerId ในธุรกรรมเดียวกัน
// ถ้าขั้นตอนใดล้มเหลว ทั้งหมดจะถูกย้อนกลับ ไม่มีข้อมูลตกค้าง
export async function createMovement(input: CreateMovementInput) {
  const validationError = validateCreateMovementInput(input);
  if (validationError) throw new Error(validationError);

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: input.assetId },
      include: { currentOwner: true },
    });
    if (!asset) throw new Error("ไม่พบครุภัณฑ์ที่ต้องการย้าย");
    if (asset.status === "disposed") {
      throw new Error("ครุภัณฑ์นี้ถูกจำหน่ายแล้ว ไม่สามารถบันทึกการเคลื่อนย้ายได้");
    }

    const toOwner = await tx.owner.findUnique({ where: { id: input.toOwnerId } });
    if (!toOwner) throw new Error("ไม่พบผู้ใช้งานปลายทางที่เลือก");

    const movement = await tx.movement.create({
      data: {
        assetId: asset.id,
        movedAt: input.movedAt,
        fromOwner: asset.currentOwner?.name ?? null,
        toOwner: toOwner.name,
        note: input.note?.trim() || null,
      },
    });

    await tx.asset.update({
      where: { id: asset.id },
      data: { currentOwnerId: toOwner.id },
    });

    return movement;
  });
}
