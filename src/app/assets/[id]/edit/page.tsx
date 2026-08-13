import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssetDetail } from "@/lib/assets";
import { getMovementDestinationOptions } from "@/lib/organization";
import { AssetForm } from "../../asset-form";

export const dynamic = "force-dynamic";

export default async function EditAssetPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const asset = await getAssetDetail(id);
  if (!asset) notFound();

  const destinations = await getMovementDestinationOptions();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-10">
      <Link href={`/assets/${id}`} className="text-sm text-blue-600 hover:underline">
        ← กลับไปหน้ารายละเอียดครุภัณฑ์
      </Link>
      <h1 className="text-2xl font-semibold">แก้ไขครุภัณฑ์: {asset.assetNumber}</h1>
      <AssetForm asset={asset} destinations={destinations} />
    </main>
  );
}
