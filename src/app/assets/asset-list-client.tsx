"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ASSET_STATUSES,
  ASSET_STATUS_BADGE_CLASS,
  ASSET_STATUS_LABELS,
  filterAssets,
  type AssetListItem,
} from "@/lib/assets";

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort((a, b) =>
    a.localeCompare(b, "th")
  );
}

export function AssetListClient({ assets }: { assets: AssetListItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [bureau, setBureau] = useState("");

  const groupOptions = useMemo(
    () => uniqueSorted(assets.map((a) => a.currentOwnerGroupName)),
    [assets]
  );
  const bureauOptions = useMemo(
    () => uniqueSorted(assets.map((a) => a.currentOwnerBureauName)),
    [assets]
  );

  const filtered = useMemo(
    () => filterAssets(assets, { search, status, group, bureau }),
    [assets, search, status, group, bureau]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาหมายเลขครุภัณฑ์, ประเภทครุภัณฑ์, ยี่ห้อ, รุ่น, ผู้ใช้งาน, กลุ่ม, สำนัก..."
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-40"
        >
          <option value="">ทุกสถานะ</option>
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ASSET_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-48"
        >
          <option value="">ทุกกลุ่ม</option>
          {groupOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={bureau}
          onChange={(e) => setBureau(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-48"
        >
          <option value="">ทุกสำนัก</option>
          {bureauOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500">
        พบ {filtered.length} รายการ จากทั้งหมด {assets.length} รายการ
      </p>

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                หมายเลขครุภัณฑ์
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                ประเภทครุภัณฑ์
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                ยี่ห้อ/รุ่น
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                สถานะ
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                ผู้ใช้งานปัจจุบัน
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                กลุ่ม
              </th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">
                สำนัก
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filtered.map((asset) => (
              <tr
                key={asset.id}
                className={`hover:bg-gray-50 ${
                  asset.status === "disposed" ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {asset.assetNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/assets/${asset.id}`} className="hover:underline">
                    {asset.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {[asset.brand, asset.model].filter(Boolean).join(" / ") || "-"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      ASSET_STATUS_BADGE_CLASS[asset.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS] ??
                      asset.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {asset.currentOwnerName ?? "-"}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {asset.currentOwnerGroupName ?? "-"}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {asset.currentOwnerBureauName ?? "-"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไข
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
