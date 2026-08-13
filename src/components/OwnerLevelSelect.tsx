"use client";

import { useState } from "react";
import type { OwnerLevel } from "@/lib/assets";
import type { MovementDestinationOption } from "@/lib/organization";

const LEVEL_LABELS: Record<OwnerLevel, string> = {
  office: "สำนัก",
  group: "กลุ่ม",
  person: "บุคคล",
};

const LEVELS: OwnerLevel[] = ["office", "group", "person"];

// ตัวเลือกผู้ถือครองแบบ 2 ขั้นตอน: เลือกระดับ (สำนัก/กลุ่ม/บุคคล) ก่อน
// แล้วค่อยเลือกรายการภายในระดับนั้น ค่าสุดท้ายเข้ารหัสเป็น "level:id" ผ่าน hidden input
export function OwnerLevelSelect({
  fieldName,
  destinations,
  initialLevel,
  initialId,
  allowNone = false,
  required = false,
}: {
  fieldName: string;
  destinations: MovementDestinationOption[];
  initialLevel?: OwnerLevel | null;
  initialId?: number | null;
  allowNone?: boolean;
  required?: boolean;
}) {
  const [level, setLevel] = useState<OwnerLevel | "none" | "">(
    initialLevel ?? (allowNone ? "none" : "")
  );
  const [selectedId, setSelectedId] = useState<string>(
    initialLevel && initialId ? String(initialId) : ""
  );

  const itemOptions = destinations.filter((d) => d.type === level);
  const encodedValue = level && level !== "none" && selectedId ? `${level}:${selectedId}` : "";

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        value={level}
        onChange={(e) => {
          setLevel(e.target.value as OwnerLevel | "none" | "");
          setSelectedId("");
        }}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-32"
      >
        {allowNone && <option value="none">ไม่ระบุ</option>}
        {!allowNone && (
          <option value="" disabled>
            เลือกระดับ
          </option>
        )}
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {LEVEL_LABELS[l]}
          </option>
        ))}
      </select>

      {level && level !== "none" && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          required={required}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            เลือก{LEVEL_LABELS[level]}
          </option>
          {itemOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {level !== "office" ? ` (${option.contextLabel})` : ""}
            </option>
          ))}
        </select>
      )}

      <input type="hidden" name={fieldName} value={encodedValue} />
    </div>
  );
}
