import { prisma } from "./prisma";

export type MovementDestinationType = "office" | "group" | "person";

export interface CreateMovementInput {
  assetId: number;
  movedAt: Date;
  toType: MovementDestinationType;
  toId: number;
  note?: string | null;
}

const VALID_DESTINATION_TYPES: MovementDestinationType[] = ["office", "group", "person"];

export function validateCreateMovementInput(input: CreateMovementInput): string | null {
  if (!Number.isInteger(input.assetId)) return "ไม่พบครุภัณฑ์ที่ต้องการย้าย";
  if (Number.isNaN(input.movedAt.getTime())) return "กรุณาระบุวันที่ให้ถูกต้อง";
  if (!VALID_DESTINATION_TYPES.includes(input.toType)) return "กรุณาเลือกปลายทาง";
  if (!Number.isInteger(input.toId)) return "กรุณาเลือกปลายทาง";
  return null;
}

// สร้างประวัติการเคลื่อนย้าย + อัปเดตผู้ถือครองปัจจุบันของครุภัณฑ์ (สำนัก/กลุ่ม/บุคคล)
// ในธุรกรรมเดียวกัน ถ้าขั้นตอนใดล้มเหลว ทั้งหมดจะถูกย้อนกลับ ไม่มีข้อมูลตกค้าง
export async function createMovement(input: CreateMovementInput) {
  const validationError = validateCreateMovementInput(input);
  if (validationError) throw new Error(validationError);

  return prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: input.assetId },
      include: { currentOffice: true, currentGroup: true, currentPerson: true },
    });
    if (!asset) throw new Error("ไม่พบครุภัณฑ์ที่ต้องการย้าย");
    if (asset.status === "disposed") {
      throw new Error("ครุภัณฑ์นี้ถูกจำหน่ายแล้ว ไม่สามารถบันทึกการเคลื่อนย้ายได้");
    }

    const fromOwner =
      asset.currentPerson?.name ?? asset.currentGroup?.name ?? asset.currentOffice?.name ?? null;

    let toOwnerName: string;
    if (input.toType === "office") {
      const toOffice = await tx.office.findUnique({ where: { id: input.toId } });
      if (!toOffice) throw new Error("ไม่พบสำนักปลายทางที่เลือก");
      toOwnerName = toOffice.name;
    } else if (input.toType === "group") {
      const toGroup = await tx.group.findUnique({ where: { id: input.toId } });
      if (!toGroup) throw new Error("ไม่พบกลุ่มปลายทางที่เลือก");
      toOwnerName = toGroup.name;
    } else {
      const toPerson = await tx.person.findUnique({ where: { id: input.toId } });
      if (!toPerson) throw new Error("ไม่พบบุคคลปลายทางที่เลือก");
      toOwnerName = toPerson.name;
    }

    const movement = await tx.movement.create({
      data: {
        assetId: asset.id,
        movedAt: input.movedAt,
        fromOwner,
        toOwner: toOwnerName,
        note: input.note?.trim() || null,
      },
    });

    await tx.asset.update({
      where: { id: asset.id },
      data: {
        currentOfficeId: input.toType === "office" ? input.toId : null,
        currentGroupId: input.toType === "group" ? input.toId : null,
        currentPersonId: input.toType === "person" ? input.toId : null,
      },
    });

    return movement;
  });
}
