import { prisma } from "./prisma";

export interface DisposeAssetInput {
  assetId: number;
  disposedAt: Date;
  reason: string;
}

export function validateDisposeAssetInput(input: DisposeAssetInput): string | null {
  if (!Number.isInteger(input.assetId)) return "ไม่พบครุภัณฑ์ที่ต้องการจำหน่าย";
  if (Number.isNaN(input.disposedAt.getTime())) return "กรุณาระบุวันที่จำหน่ายให้ถูกต้อง";
  if (!input.reason || !input.reason.trim()) return "กรุณาระบุเหตุผลการจำหน่าย";
  return null;
}

// เปลี่ยนสถานะเป็น "จำหน่าย" พร้อมบันทึกวันที่และเหตุผลในการอัปเดตแถวเดียวกัน (atomic)
export async function disposeAsset(input: DisposeAssetInput) {
  const validationError = validateDisposeAssetInput(input);
  if (validationError) throw new Error(validationError);

  const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) throw new Error("ไม่พบครุภัณฑ์ที่ต้องการจำหน่าย");
  if (asset.status === "disposed") throw new Error("ครุภัณฑ์นี้ถูกจำหน่ายไปแล้ว");

  return prisma.asset.update({
    where: { id: input.assetId },
    data: {
      status: "disposed",
      disposedAt: input.disposedAt,
      disposalReason: input.reason.trim(),
    },
  });
}
