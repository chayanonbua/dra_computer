// สคริปต์นำเข้ารายการครุภัณฑ์ (เครื่องพิมพ์) จากไฟล์ Excel เข้าสู่ตาราง Asset
// รันครั้งเดียวด้วยมือ (ไม่ได้ผูกกับ `prisma migrate reset`/seed อัตโนมัติ):
//   npx tsx prisma/import-printer-assets-seed.ts
//
// คอลัมน์ในไฟล์: หมายเลขครุภัณฑ์, ชื่อ/ประเภท, ยี่ห้อ, รุ่น, สถานะ, ผู้ถือครอง, ระดับผู้ถือครอง, สำนัก/กอง
// ผูก "ผู้ถือครอง" กับ Person/Group/Office ที่มีอยู่แล้วในระบบด้วยการจับคู่ชื่อตามระดับที่ระบุ
// (ไม่สร้างผู้ถือครองใหม่ — ถ้าจับคู่ไม่ได้หรือกำกวม สคริปต์จะหยุดโดยไม่เขียนข้อมูลใดๆ ลงฐานข้อมูล)

import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import path from "node:path";

const prisma = new PrismaClient();

const FILE_PATH = path.join(
  __dirname,
  "..",
  "รายการครุภัณฑ์_เครื่องพิมพ์_จัดรูปแบบใหม่.xlsx"
);

const STATUS_MAP: Record<string, string> = {
  ใช้งาน: "active",
  ซ่อม: "repairing",
  จำหน่าย: "disposed",
};

function norm(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

interface Row {
  rowNumber: number; // เลขแถวในไฟล์ Excel (1-based, รวม header)
  assetNumber: string;
  typeName: string;
  brand: string;
  model: string;
  status: string;
  ownerName: string;
  ownerLevel: string;
  officeCol: string;
}

function readRows(): Row[] {
  const wb = XLSX.readFile(FILE_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

  return raw.slice(1).map((r, idx) => ({
    rowNumber: idx + 2,
    assetNumber: norm(r[0]),
    typeName: norm(r[1]),
    brand: norm(r[2]),
    model: norm(r[3]),
    status: norm(r[4]),
    ownerName: norm(r[5]),
    ownerLevel: norm(r[6]),
    officeCol: norm(r[7]),
  }));
}

type Owner =
  | { type: "office"; officeId: number; officeName: string }
  | { type: "group"; groupId: number; officeName: string }
  | { type: "person"; personId: number; officeName: string };

async function main() {
  const rows = readRows();

  const [offices, groups, people, existingAssets] = await Promise.all([
    prisma.office.findMany(),
    prisma.group.findMany({ include: { office: true } }),
    prisma.person.findMany({ include: { group: { include: { office: true } } } }),
    prisma.asset.findMany({ select: { assetNumber: true } }),
  ]);

  const officeByName = new Map(offices.map((o) => [o.name, o]));
  const groupsByName = new Map<string, typeof groups>();
  for (const g of groups) {
    const list = groupsByName.get(g.name) ?? [];
    list.push(g);
    groupsByName.set(g.name, list);
  }
  const peopleByName = new Map<string, typeof people>();
  for (const p of people) {
    const list = peopleByName.get(p.name) ?? [];
    list.push(p);
    peopleByName.set(p.name, list);
  }
  const existingAssetNumbers = new Set(existingAssets.map((a) => a.assetNumber));
  const assetNumbersInFile = new Map<string, number>(); // assetNumber -> แถวแรกที่พบ

  const errors: string[] = [];
  interface PreparedRow extends Row {
    owner: Owner;
    mappedStatus: string;
  }
  const prepared: PreparedRow[] = [];

  for (const row of rows) {
    const rowErrors: string[] = [];

    if (!row.assetNumber) rowErrors.push("ไม่มีหมายเลขครุภัณฑ์");
    if (!row.typeName) rowErrors.push("ไม่มีชื่อ/ประเภท");

    if (row.assetNumber) {
      if (existingAssetNumbers.has(row.assetNumber)) {
        rowErrors.push(`หมายเลขครุภัณฑ์ "${row.assetNumber}" ซ้ำกับที่มีอยู่แล้วในระบบ`);
      }
      const firstSeenAt = assetNumbersInFile.get(row.assetNumber);
      if (firstSeenAt !== undefined) {
        rowErrors.push(`หมายเลขครุภัณฑ์ "${row.assetNumber}" ซ้ำกันเองในไฟล์ (ซ้ำกับแถวที่ ${firstSeenAt})`);
      } else {
        assetNumbersInFile.set(row.assetNumber, row.rowNumber);
      }
    }

    let mappedStatus: string | undefined;
    if (!row.status) {
      rowErrors.push("ไม่มีสถานะ");
    } else {
      mappedStatus = STATUS_MAP[row.status];
      if (!mappedStatus) {
        rowErrors.push(
          `สถานะ "${row.status}" ไม่ใช่ค่าที่รู้จัก (ต้องเป็น ใช้งาน / ซ่อม / จำหน่าย)`
        );
      }
    }

    let owner: Owner | undefined;
    if (!row.ownerLevel) {
      rowErrors.push("ไม่มีระดับผู้ถือครอง");
    } else if (!row.ownerName) {
      rowErrors.push("ไม่มีชื่อผู้ถือครอง");
    } else if (row.ownerLevel === "บุคคล") {
      const candidates = peopleByName.get(row.ownerName) ?? [];
      if (candidates.length === 0) {
        rowErrors.push(`ไม่พบบุคคลชื่อ "${row.ownerName}" ในระบบ`);
      } else if (candidates.length > 1) {
        rowErrors.push(`พบบุคคลชื่อ "${row.ownerName}" มากกว่า 1 คนในระบบ (กำกวม ไม่สามารถระบุได้)`);
      } else {
        owner = {
          type: "person",
          personId: candidates[0].id,
          officeName: candidates[0].group.office.name,
        };
      }
    } else if (row.ownerLevel === "กลุ่ม") {
      let candidates = groupsByName.get(row.ownerName) ?? [];
      if (candidates.length > 1 && row.officeCol) {
        const byOffice = candidates.filter((g) => g.office.name === row.officeCol);
        if (byOffice.length === 1) candidates = byOffice;
      }
      if (candidates.length === 0) {
        rowErrors.push(`ไม่พบกลุ่มชื่อ "${row.ownerName}" ในระบบ`);
      } else if (candidates.length > 1) {
        rowErrors.push(
          `พบกลุ่มชื่อ "${row.ownerName}" มากกว่า 1 กลุ่มในระบบ (กำกวม) — สังกัดที่เป็นไปได้: ${candidates
            .map((g) => g.office.name)
            .join(", ")}`
        );
      } else {
        owner = { type: "group", groupId: candidates[0].id, officeName: candidates[0].office.name };
      }
    } else if (row.ownerLevel === "สำนัก") {
      const office = officeByName.get(row.ownerName);
      if (!office) {
        rowErrors.push(`ไม่พบสำนัก/กองชื่อ "${row.ownerName}" ในระบบ`);
      } else {
        owner = { type: "office", officeId: office.id, officeName: office.name };
      }
    } else {
      rowErrors.push(`ระดับผู้ถือครอง "${row.ownerLevel}" ไม่ใช่ค่าที่รู้จัก (ต้องเป็น บุคคล / กลุ่ม / สำนัก)`);
    }

    if (rowErrors.length > 0) {
      errors.push(`แถวที่ ${row.rowNumber} (${row.assetNumber || "ไม่มีเลขครุภัณฑ์"}): ${rowErrors.join("; ")}`);
      continue;
    }

    prepared.push({ ...row, owner: owner!, mappedStatus: mappedStatus! });
  }

  if (errors.length > 0) {
    console.error(`พบปัญหา ${errors.length} แถว — ไม่นำเข้าข้อมูลใดๆ ทั้งหมด (หยุดก่อนเขียนฐานข้อมูล):\n`);
    errors.forEach((e) => console.error(" -", e));
    process.exitCode = 1;
    return;
  }

  // ---- ทุกแถวผ่านการตรวจสอบแล้ว เขียนลงฐานข้อมูล ----
  const officeCounts = new Map<string, number>();

  await prisma.$transaction(
    prepared.map((row) => {
      const data: Record<string, unknown> = {
        assetNumber: row.assetNumber,
        name: row.typeName,
        brand: row.brand || null,
        model: row.model || null,
        status: row.mappedStatus,
      };
      if (row.owner.type === "office") data.currentOfficeId = row.owner.officeId;
      if (row.owner.type === "group") data.currentGroupId = row.owner.groupId;
      if (row.owner.type === "person") data.currentPersonId = row.owner.personId;

      officeCounts.set(row.owner.officeName, (officeCounts.get(row.owner.officeName) ?? 0) + 1);

      return prisma.asset.create({ data: data as never });
    })
  );

  console.log(`นำเข้าครุภัณฑ์สำเร็จ ${prepared.length} รายการ\n`);
  console.log("แยกตามสำนัก/กอง:");
  Array.from(officeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([officeName, count]) => console.log(`  - ${officeName}: ${count} รายการ`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
