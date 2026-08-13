"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { OwnerLevelSelect } from "@/components/OwnerLevelSelect";
import { ASSET_STATUSES, ASSET_STATUS_LABELS, type AssetDetail } from "@/lib/assets";
import type { MovementDestinationOption } from "@/lib/organization";
import { createAssetAction, updateAssetAction, type AssetFormState } from "./form-actions";

const initialState: AssetFormState = { success: false, error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? "กำลังบันทึก..." : label}
    </button>
  );
}

function dateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function AssetForm({
  asset,
  destinations,
}: {
  asset?: AssetDetail;
  destinations: MovementDestinationOption[];
}) {
  const action = asset ? updateAssetAction.bind(null, asset.id) : createAssetAction;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        <span className="text-red-600">*</span> ช่องที่จำเป็นต้องกรอก
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">
          หมายเลขครุภัณฑ์ <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="assetNumber"
          required
          defaultValue={asset?.assetNumber ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          ชื่อ/ประเภท <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          name="name"
          required
          defaultValue={asset?.name ?? ""}
          placeholder="เช่น คอมพิวเตอร์ตั้งโต๊ะ"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">ยี่ห้อ</label>
          <input
            type="text"
            name="brand"
            defaultValue={asset?.brand ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">รุ่น</label>
          <input
            type="text"
            name="model"
            defaultValue={asset?.model ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">สถานะ</label>
        <select
          name="status"
          defaultValue={asset?.status ?? "active"}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-48"
        >
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ASSET_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">ผู้ถือครอง</label>
        <OwnerLevelSelect
          fieldName="owner"
          destinations={destinations}
          initialLevel={asset?.currentOwnerLevel ?? null}
          initialId={asset?.currentOwnerId ?? null}
          allowNone
        />
        {asset && (
          <p className="mt-1 text-xs text-gray-400">
            หมายเหตุ: การเปลี่ยนผู้ถือครองที่นี่จะไม่ถูกบันทึกในประวัติการเคลื่อนย้าย
            ใช้ปุ่ม &ldquo;บันทึกการเคลื่อนย้าย&rdquo; ในหน้ารายละเอียดหากต้องการเก็บประวัติ
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">วันที่ได้มา</label>
        <input
          type="date"
          name="acquiredAt"
          defaultValue={dateInputValue(asset?.acquiredAt)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-48"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">หมายเหตุ</label>
        <textarea
          name="note"
          rows={3}
          defaultValue={asset?.note ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <Link
          href={asset ? `/assets/${asset.id}` : "/assets"}
          className="rounded border border-gray-300 px-4 py-2 text-sm"
        >
          ยกเลิก
        </Link>
        <SubmitButton label={asset ? "บันทึกการแก้ไข" : "เพิ่มครุภัณฑ์"} />
      </div>
    </form>
  );
}
