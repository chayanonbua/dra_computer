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

export function AssetListClient({ assets }: { assets: AssetListItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(
    () => filterAssets(assets, { search, status }),
    [assets, search, status]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาหมายเลขครุภัณฑ์, ชื่อ, ยี่ห้อ, รุ่น, ผู้ใช้งาน..."
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-48"
        >
          <option value="">ทุกสถานะ</option>
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ASSET_STATUS_LABELS[s]}
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
                ชื่อ
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filtered.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50">
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
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
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
