"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ASSET_STATUSES,
  ASSET_STATUS_BADGE_CLASS,
  ASSET_STATUS_LABELS,
  filterAssets,
  formatOwnerDisplayName,
  type AssetListItem,
} from "@/lib/assets";
import { getPageNumbers, paginate } from "@/lib/pagination";

const PAGE_SIZE = 10;

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort((a, b) =>
    a.localeCompare(b, "th")
  );
}

export function AssetListClient({ assets }: { assets: AssetListItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [group, setGroup] = useState("");
  const [office, setOffice] = useState("");
  const [page, setPage] = useState(1);

  const groupOptions = useMemo(
    () => uniqueSorted(assets.map((a) => a.currentOwnerGroupName)),
    [assets]
  );
  const officeOptions = useMemo(
    () => uniqueSorted(assets.map((a) => a.currentOwnerOfficeName)),
    [assets]
  );

  const filtered = useMemo(
    () => filterAssets(assets, { search, status, group, office }),
    [assets, search, status, group, office]
  );

  // เมื่อค้นหา/ฟิลเตอร์เปลี่ยน ผลลัพธ์เปลี่ยน ให้กลับไปหน้าแรกเสมอ
  useEffect(() => {
    setPage(1);
  }, [search, status, group, office]);

  const pagination = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);

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
          value={office}
          onChange={(e) => setOffice(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm sm:w-48"
        >
          <option value="">ทุกสำนัก</option>
          {officeOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500">
        พบ {filtered.length} รายการ จากทั้งหมด {assets.length} รายการ
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                หมายเลขครุภัณฑ์
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                ชื่อ/ประเภท
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                ยี่ห้อ/รุ่น
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                สถานะ
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                ผู้ถือครอง
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagination.items.map((asset, idx) => {
              const ownerDisplayName = asset.currentOwnerName
                ? formatOwnerDisplayName(asset.currentOwnerName)
                : "-";
              return (
                <tr
                  key={asset.id}
                  className={`${idx % 2 === 1 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 ${
                    asset.status === "disposed" ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {asset.assetNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/assets/${asset.id}`} className="hover:underline">
                      {asset.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {[asset.brand, asset.model].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        ASSET_STATUS_BADGE_CLASS[asset.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS] ??
                        asset.status}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-4 py-4 text-gray-600">
                    <span className="block truncate" title={ownerDisplayName}>
                      {ownerDisplayName}
                    </span>
                  </td>
                </tr>
              );
            })}
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

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            หน้า {pagination.currentPage} จาก {pagination.totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={pagination.currentPage <= 1}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← ก่อนหน้า
            </button>
            {getPageNumbers(pagination.currentPage, pagination.totalPages).map((entry, i) =>
              entry === "ellipsis" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setPage(entry)}
                  aria-current={entry === pagination.currentPage ? "page" : undefined}
                  className={`min-w-[2.25rem] rounded border px-3 py-1.5 text-sm ${
                    entry === pagination.currentPage
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {entry}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ถัดไป →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
