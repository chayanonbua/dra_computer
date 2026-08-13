import { getAssetListItems } from "@/lib/assets";
import { AssetListClient } from "./asset-list-client";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await getAssetListItems();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6 sm:p-10">
      <h1 className="text-2xl font-semibold">รายการครุภัณฑ์ทั้งหมด</h1>
      <AssetListClient assets={assets} />
    </main>
  );
}
