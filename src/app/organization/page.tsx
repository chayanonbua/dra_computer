import Link from "next/link";
import { getGroups, getOffices, getOrganizationTree } from "@/lib/organization";
import { OrganizationClient } from "./organization-client";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const [tree, offices, groups] = await Promise.all([
    getOrganizationTree(),
    getOffices(),
    getGroups(),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6 sm:p-10">
      <Link href="/assets" className="text-sm text-blue-600 hover:underline">
        ← กลับไปหน้ารายการครุภัณฑ์
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">จัดการโครงสร้างหน่วยงาน</h1>
        <p className="mt-1 text-sm text-gray-600">
          สำนัก → กลุ่ม → บุคคล — ลบสำนัก/กลุ่มที่ยังมีข้อมูลอยู่ภายใน หรือลบบุคคล/กลุ่มที่ยังถือครองครุภัณฑ์อยู่ไม่ได้
        </p>
      </div>

      <OrganizationClient tree={tree} offices={offices} groups={groups} />
    </main>
  );
}
