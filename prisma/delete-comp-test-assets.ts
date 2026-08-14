// สคริปต์ลบครุภัณฑ์ตัวอย่าง/ทดสอบที่หมายเลขขึ้นต้นด้วย "COMP" (ใส่ไว้ตอนตั้งโครงโปรเจกต์)
// รันครั้งเดียวด้วยมือ หลังจากผู้ใช้ยืนยันรายการที่จะลบแล้วเท่านั้น:
//   npx tsx prisma/delete-comp-test-assets.ts
//
// ลบ Repair/Movement ที่ผูกกับครุภัณฑ์เหล่านี้ก่อน (FK เป็น ON DELETE RESTRICT ลบ Asset ตรงๆ ไม่ได้ถ้ายังมีประวัติผูกอยู่)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    where: { assetNumber: { startsWith: "COMP" } },
  });

  if (assets.length === 0) {
    console.log('ไม่พบครุภัณฑ์ที่ขึ้นต้นด้วย "COMP" ในระบบ ไม่มีอะไรต้องลบ');
    return;
  }

  const assetIds = assets.map((a) => a.id);

  const [deletedRepairs, deletedMovements] = await prisma.$transaction([
    prisma.repair.deleteMany({ where: { assetId: { in: assetIds } } }),
    prisma.movement.deleteMany({ where: { assetId: { in: assetIds } } }),
  ]);

  const deletedAssets = await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });

  console.log(`ลบครุภัณฑ์สำเร็จ ${deletedAssets.count} รายการ:`);
  assets.forEach((a) => console.log(`  - ${a.assetNumber} (${a.name})`));
  console.log(
    `\nลบประวัติที่ผูกอยู่ด้วย: ประวัติซ่อม ${deletedRepairs.count} รายการ, ประวัติย้าย ${deletedMovements.count} รายการ`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
