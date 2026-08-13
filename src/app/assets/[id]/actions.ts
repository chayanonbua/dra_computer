"use server";

import { revalidatePath } from "next/cache";
import { createRepair } from "@/lib/repairs";
import { createMovement, type MovementDestinationType } from "@/lib/movements";
import { disposeAsset } from "@/lib/disposal";

export interface ActionState {
  success: boolean;
  error: string | null;
}

export async function createRepairAction(
  assetId: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const costRaw = formData.get("cost");

    await createRepair({
      assetId,
      repairedAt: new Date(String(formData.get("repairedAt") ?? "")),
      symptom: String(formData.get("symptom") ?? ""),
      solution: (formData.get("solution") as string) || null,
      cost: costRaw ? Number(costRaw) : null,
      handledBy: (formData.get("handledBy") as string) || null,
    });

    revalidatePath(`/assets/${assetId}`);
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "บันทึกการซ่อมไม่สำเร็จ",
    };
  }
}

export async function createMovementAction(
  assetId: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const [toType, toIdRaw] = String(formData.get("destination") ?? "").split(":");

    await createMovement({
      assetId,
      movedAt: new Date(String(formData.get("movedAt") ?? "")),
      toType: toType as MovementDestinationType,
      toId: Number(toIdRaw),
      note: (formData.get("note") as string) || null,
    });

    revalidatePath(`/assets/${assetId}`);
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "บันทึกการเคลื่อนย้ายไม่สำเร็จ",
    };
  }
}

export async function disposeAssetAction(
  assetId: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await disposeAsset({
      assetId,
      disposedAt: new Date(String(formData.get("disposedAt") ?? "")),
      reason: String(formData.get("reason") ?? ""),
    });

    revalidatePath(`/assets/${assetId}`);
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "บันทึกการจำหน่ายไม่สำเร็จ",
    };
  }
}
