import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ASSET_STATUS_BADGE_CLASS,
  ASSET_STATUS_LABELS,
  getAssetDetail,
} from "@/lib/assets";
import { getOwners } from "@/lib/owners";
import { AssetActions } from "./asset-actions";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCost(cost: number | null): string {
  if (cost === null) return "-";
  return `${cost.toLocaleString("th-TH")} บาท`;
}

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const asset = await getAssetDetail(id);
  if (!asset) notFound();

  const owners = await getOwners();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 sm:p-10">
      <Link href="/assets" className="text-sm text-blue-600 hover:underline">
        ← กลับไปหน้ารายการครุภัณฑ์
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{asset.assetNumber}</h1>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              ASSET_STATUS_BADGE_CLASS[asset.status] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS] ??
              asset.status}
          </span>
        </div>
        <p className="text-gray-600">{asset.name}</p>
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded border border-gray-200 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-gray-500">ยี่ห้อ/รุ่น</dt>
          <dd className="mt-1">
            {[asset.brand, asset.model].filter(Boolean).join(" / ") || "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">ผู้ใช้งานปัจจุบัน</dt>
          <dd className="mt-1">{asset.currentOwnerName ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">กลุ่ม</dt>
          <dd className="mt-1">{asset.currentOwnerGroupName ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">สำนัก</dt>
          <dd className="mt-1">{asset.currentOwnerBureauName ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-gray-500">วันที่ได้มา</dt>
          <dd className="mt-1">{formatDate(asset.acquiredAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-gray-500">หมายเหตุ</dt>
          <dd className="mt-1 whitespace-pre-wrap">{asset.note ?? "-"}</dd>
        </div>
        {asset.status === "disposed" && (
          <>
            <div>
              <dt className="text-xs font-medium text-gray-500">วันที่จำหน่าย</dt>
              <dd className="mt-1">{formatDate(asset.disposedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500">เหตุผลการจำหน่าย</dt>
              <dd className="mt-1">{asset.disposalReason ?? "-"}</dd>
            </div>
          </>
        )}
      </dl>

      <AssetActions
        assetId={asset.id}
        status={asset.status}
        currentOwnerName={asset.currentOwnerName}
        owners={owners}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">ประวัติการซ่อมและการเคลื่อนย้าย</h2>

        {asset.timeline.length === 0 && (
          <p className="text-sm text-gray-400">ยังไม่มีประวัติของครุภัณฑ์ชิ้นนี้</p>
        )}

        <ol className="flex flex-col gap-3">
          {asset.timeline.map((entry) => (
            <li
              key={entry.type === "disposal" ? "disposal" : `${entry.type}-${entry.id}`}
              className="rounded border border-gray-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    entry.type === "repair"
                      ? "bg-orange-100 text-orange-800"
                      : entry.type === "movement"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {entry.type === "repair"
                    ? "ซ่อม"
                    : entry.type === "movement"
                      ? "ย้าย"
                      : "จำหน่าย"}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDate(entry.date)}
                </span>
              </div>

              {entry.type === "repair" && (
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <p>
                    <span className="font-medium">อาการ:</span> {entry.symptom}
                  </p>
                  {entry.solution && (
                    <p>
                      <span className="font-medium">การแก้ไข:</span>{" "}
                      {entry.solution}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">ค่าใช้จ่าย:</span>{" "}
                    {formatCost(entry.cost)}
                  </p>
                  {entry.handledBy && (
                    <p>
                      <span className="font-medium">ผู้ดำเนินการ:</span>{" "}
                      {entry.handledBy}
                    </p>
                  )}
                </div>
              )}

              {entry.type === "movement" && (
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <p>
                    <span className="font-medium">ย้ายจาก:</span>{" "}
                    {entry.fromOwner ?? "-"}
                    <span className="mx-2">→</span>
                    <span className="font-medium">ไปยัง:</span> {entry.toOwner}
                  </p>
                  {entry.note && (
                    <p>
                      <span className="font-medium">หมายเหตุ:</span> {entry.note}
                    </p>
                  )}
                </div>
              )}

              {entry.type === "disposal" && (
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <p>
                    <span className="font-medium">เหตุผล:</span>{" "}
                    {entry.reason ?? "-"}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
