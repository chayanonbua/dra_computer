import { prisma } from "./prisma";

export interface CreateRepairInput {
  assetId: number;
  repairedAt: Date;
  symptom: string;
  solution?: string | null;
  cost?: number | null;
  handledBy?: string | null;
}

export function validateCreateRepairInput(input: CreateRepairInput): string | null {
  if (!Number.isInteger(input.assetId)) return "ไม่พบครุภัณฑ์ที่ต้องการบันทึกการซ่อม";
  if (Number.isNaN(input.repairedAt.getTime())) return "กรุณาระบุวันที่ให้ถูกต้อง";
  if (!input.symptom || !input.symptom.trim()) return "กรุณาระบุอาการ";
  if (input.cost != null && (Number.isNaN(input.cost) || input.cost < 0)) {
    return "ค่าใช้จ่ายต้องเป็นตัวเลขไม่ติดลบ";
  }
  return null;
}

export async function createRepair(input: CreateRepairInput) {
  const validationError = validateCreateRepairInput(input);
  if (validationError) throw new Error(validationError);

  const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) throw new Error("ไม่พบครุภัณฑ์ที่ต้องการบันทึกการซ่อม");
  if (asset.status === "disposed") {
    throw new Error("ครุภัณฑ์นี้ถูกจำหน่ายแล้ว ไม่สามารถบันทึกการซ่อมได้");
  }

  return prisma.repair.create({
    data: {
      assetId: input.assetId,
      repairedAt: input.repairedAt,
      symptom: input.symptom.trim(),
      solution: input.solution?.trim() || null,
      cost: input.cost ?? null,
      handledBy: input.handledBy?.trim() || null,
    },
  });
}
