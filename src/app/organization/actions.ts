"use server";

import { revalidatePath } from "next/cache";
import {
  createOffice,
  updateOffice,
  deleteOffice,
  createGroup,
  updateGroup,
  deleteGroup,
  createPerson,
  updatePerson,
  deletePerson,
} from "@/lib/organization";

export interface ActionState {
  success: boolean;
  error: string | null;
}

// ---- สำนัก ----

export async function createOfficeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await createOffice(String(formData.get("name") ?? ""));
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "เพิ่มสำนักไม่สำเร็จ" };
  }
}

export async function updateOfficeAction(
  id: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await updateOffice(id, String(formData.get("name") ?? ""));
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "แก้ไขสำนักไม่สำเร็จ" };
  }
}

export async function deleteOfficeAction(id: number): Promise<ActionState> {
  try {
    await deleteOffice(id);
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ลบสำนักไม่สำเร็จ" };
  }
}

// ---- กลุ่ม ----

export async function createGroupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await createGroup(String(formData.get("name") ?? ""), Number(formData.get("officeId")));
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "เพิ่มกลุ่มไม่สำเร็จ" };
  }
}

export async function updateGroupAction(
  id: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await updateGroup(id, String(formData.get("name") ?? ""), Number(formData.get("officeId")));
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "แก้ไขกลุ่มไม่สำเร็จ" };
  }
}

export async function deleteGroupAction(id: number): Promise<ActionState> {
  try {
    await deleteGroup(id);
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ลบกลุ่มไม่สำเร็จ" };
  }
}

// ---- บุคคล ----

export async function createPersonAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await createPerson(String(formData.get("name") ?? ""), Number(formData.get("groupId")));
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "เพิ่มบุคคลไม่สำเร็จ" };
  }
}

export async function updatePersonAction(
  id: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await updatePerson(id, String(formData.get("name") ?? ""), Number(formData.get("groupId")));
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "แก้ไขบุคคลไม่สำเร็จ" };
  }
}

export async function deletePersonAction(id: number): Promise<ActionState> {
  try {
    await deletePerson(id);
    revalidatePath("/organization");
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ลบบุคคลไม่สำเร็จ" };
  }
}
