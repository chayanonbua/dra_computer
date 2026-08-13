"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAsset, updateAsset, type AssetInput, type AssetOwnerAssignment, type OwnerLevel } from "@/lib/assets";

export interface AssetFormState {
  success: boolean;
  error: string | null;
}

function parseOwner(raw: string): AssetOwnerAssignment | null {
  if (!raw) return null;
  const [level, idRaw] = raw.split(":");
  const id = Number(idRaw);
  if (!id) return null;
  return { level: level as OwnerLevel, id };
}

function parseFormData(formData: FormData): AssetInput {
  const acquiredAtRaw = String(formData.get("acquiredAt") ?? "");
  return {
    assetNumber: String(formData.get("assetNumber") ?? ""),
    name: String(formData.get("name") ?? ""),
    brand: (formData.get("brand") as string) || null,
    model: (formData.get("model") as string) || null,
    status: String(formData.get("status") ?? "active"),
    acquiredAt: acquiredAtRaw ? new Date(acquiredAtRaw) : null,
    note: (formData.get("note") as string) || null,
    owner: parseOwner(String(formData.get("owner") ?? "")),
  };
}

export async function createAssetAction(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  let newAssetId: number;
  try {
    const asset = await createAsset(parseFormData(formData));
    newAssetId = asset.id;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "เพิ่มครุภัณฑ์ไม่สำเร็จ",
    };
  }

  revalidatePath("/assets");
  redirect(`/assets/${newAssetId}`);
}

export async function updateAssetAction(
  id: number,
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  try {
    await updateAsset(id, parseFormData(formData));
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "แก้ไขครุภัณฑ์ไม่สำเร็จ",
    };
  }

  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  redirect(`/assets/${id}`);
}
