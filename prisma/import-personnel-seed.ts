// สคริปต์นำเข้ารายชื่อบุคลากรจากไฟล์ Excel เข้าสู่โครงสร้าง สำนัก > กลุ่ม > บุคคล
// รันครั้งเดียวด้วยมือ (ไม่ได้ผูกกับ `prisma migrate reset`/seed อัตโนมัติ):
//   npx tsx prisma/import-personnel-seed.ts
//
// ก่อนรัน: ลบข้อมูลตัวอย่าง (Office/Group/Person เดิม) ตามที่ผู้ใช้ยืนยันแล้ว
// เนื่องจากชื่อสำนัก "สำนักงานเลขานุการกรม" ชนกับข้อมูลจริงในไฟล์พอดี

import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import path from "node:path";

const prisma = new PrismaClient();

const FILE_PATH = path.join(__dirname, "..", "รายชื่อบุคลากร_จัดรูปแบบใหม่.xlsx");

// แถวที่ช่องชื่อ-สกุลเป็นค่านี้ (หรือใกล้เคียง) คือ header ที่หลุดมาปนเป็นข้อมูล ไม่ใช่ชื่อคนจริง
const BOGUS_NAME_VALUES = new Set(["ชื่อ - สกุล", "ชื่อ-สกุล", "ชื่อ สกุล"]);

function norm(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

interface Row {
  office: string;
  group: string;
  name: string;
  rowNumber: number; // เลขแถวในไฟล์ Excel (1-based, รวม header)
}

function readRows(): Row[] {
  const wb = XLSX.readFile(FILE_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

  // แถวแรก (index 0) คือ header: สำนัก/กอง, กลุ่ม/ฝ่าย, ชื่อ-สกุล
  return raw.slice(1).map((r, idx) => ({
    office: norm(r[0]),
    group: norm(r[1]),
    name: norm(r[2]),
    rowNumber: idx + 2,
  }));
}

async function main() {
  const rows = readRows();

  const anomalies: string[] = [];
  const validRows: Row[] = [];

  for (const row of rows) {
    if (!row.office || !row.group) {
      anomalies.push(
        `แถวที่ ${row.rowNumber}: ไม่มีสำนัก/กอง หรือกลุ่ม/ฝ่าย ข้ามแถวนี้ทั้งหมด — ${JSON.stringify(row)}`
      );
      continue;
    }
    if (row.name && BOGUS_NAME_VALUES.has(row.name)) {
      anomalies.push(
        `แถวที่ ${row.rowNumber}: ช่องชื่อ-สกุลมีค่า "${row.name}" ซึ่งดูเหมือน header ที่หลุดมาปนเป็นข้อมูล ` +
          `จะสร้างสำนัก/กลุ่มตามปกติ แต่ไม่สร้างบุคคลนี้`
      );
      validRows.push({ ...row, name: "" });
      continue;
    }
    validRows.push(row);
  }

  // ---- ลบข้อมูลตัวอย่างเดิม (ยืนยันจากผู้ใช้แล้ว) ----
  // เคลียร์ผู้ถือครองของครุภัณฑ์ตัวอย่างที่ผูกกับกลุ่ม/บุคคลตัวอย่างก่อน (ไม่ลบครุภัณฑ์)
  const clearedAssets = await prisma.asset.updateMany({
    where: { OR: [{ currentGroupId: { not: null } }, { currentPersonId: { not: null } }] },
    data: { currentGroupId: null, currentPersonId: null },
  });
  const deletedPeople = await prisma.person.deleteMany({});
  const deletedGroups = await prisma.group.deleteMany({});
  const deletedOffices = await prisma.office.deleteMany({});

  console.log("ลบข้อมูลตัวอย่างเดิม:", {
    assetsUnassigned: clearedAssets.count,
    people: deletedPeople.count,
    groups: deletedGroups.count,
    offices: deletedOffices.count,
  });

  // ---- นำเข้าข้อมูลจริง ----
  const officeCache = new Map<string, number>(); // officeName -> officeId
  const groupCache = new Map<string, number>(); // `${officeId}|||${groupName}` -> groupId

  let officesCreated = 0;
  let groupsCreated = 0;
  let peopleCreated = 0;

  for (const row of validRows) {
    let officeId = officeCache.get(row.office);
    if (officeId === undefined) {
      const office = await prisma.office.create({ data: { name: row.office } });
      officeId = office.id;
      officeCache.set(row.office, officeId);
      officesCreated++;
    }

    const groupKey = `${officeId}|||${row.group}`;
    let groupId = groupCache.get(groupKey);
    if (groupId === undefined) {
      const group = await prisma.group.create({ data: { name: row.group, officeId } });
      groupId = group.id;
      groupCache.set(groupKey, groupId);
      groupsCreated++;
    }

    if (row.name) {
      await prisma.person.create({ data: { name: row.name, groupId } });
      peopleCreated++;
    }
  }

  console.log("\nนำเข้าสำเร็จ:", {
    offices: officesCreated,
    groups: groupsCreated,
    people: peopleCreated,
  });

  if (anomalies.length > 0) {
    console.log(`\nพบแถวผิดปกติ ${anomalies.length} รายการ:`);
    anomalies.forEach((a) => console.log(" -", a));
  } else {
    console.log("\nไม่พบแถวผิดปกติ");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
