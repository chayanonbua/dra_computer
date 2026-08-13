import Link from "next/link";
import { getAssetListItems } from "@/lib/assets";
import { AssetListClient } from "./asset-list-client";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await getAssetListItems();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">รายการครุภัณฑ์ทั้งหมด</h1>
        <div className="flex items-center gap-4">
          <Link href="/organization" className="text-sm text-blue-600 hover:underline">
            จัดการโครงสร้างหน่วยงาน →
          </Link>
          <Link
            href="/assets/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            เพิ่มครุภัณฑ์
          </Link>
        </div>
      </div>
      <AssetListClient assets={assets} />
    </main>
  );
}
