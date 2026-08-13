import Link from "next/link";
import { getMovementDestinationOptions } from "@/lib/organization";
import { AssetForm } from "../asset-form";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  const destinations = await getMovementDestinationOptions();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-10">
      <Link href="/assets" className="text-sm text-blue-600 hover:underline">
        ← กลับไปหน้ารายการครุภัณฑ์
      </Link>
      <h1 className="text-2xl font-semibold">เพิ่มครุภัณฑ์</h1>
      <AssetForm destinations={destinations} />
    </main>
  );
}
