import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [itDept, accounting, somchai] = await Promise.all([
    prisma.owner.create({ data: { name: "ฝ่ายไอที", type: "group" } }),
    prisma.owner.create({ data: { name: "ฝ่ายบัญชี", type: "group" } }),
    prisma.owner.create({ data: { name: "สมชาย ใจดี", type: "person" } }),
  ]);

  const desktop = await prisma.asset.create({
    data: {
      assetNumber: "COMP-2024-001",
      name: "คอมพิวเตอร์ตั้งโต๊ะ",
      brand: "Dell",
      model: "OptiPlex 7010",
      status: "active",
      acquiredAt: new Date("2024-01-15"),
      currentOwnerId: accounting.id,
      note: "เครื่องประจำแผนกบัญชี",
    },
  });

  const laptop = await prisma.asset.create({
    data: {
      assetNumber: "COMP-2024-002",
      name: "โน้ตบุ๊ก",
      brand: "Lenovo",
      model: "ThinkPad T14",
      status: "repairing",
      acquiredAt: new Date("2023-06-01"),
      currentOwnerId: somchai.id,
      note: "จอมีปัญหา อยู่ระหว่างซ่อม",
    },
  });

  const printer = await prisma.asset.create({
    data: {
      assetNumber: "COMP-2022-015",
      name: "เครื่องพิมพ์",
      brand: "HP",
      model: "LaserJet Pro M404dn",
      status: "active",
      acquiredAt: new Date("2022-09-10"),
      currentOwnerId: itDept.id,
    },
  });

  const oldServer = await prisma.asset.create({
    data: {
      assetNumber: "COMP-2019-003",
      name: "เครื่องเซิร์ฟเวอร์",
      brand: "HPE",
      model: "ProLiant DL380",
      status: "disposed",
      acquiredAt: new Date("2019-03-20"),
      note: "จำหน่ายแล้วเนื่องจากหมดอายุการใช้งาน",
    },
  });

  await prisma.repair.create({
    data: {
      assetId: laptop.id,
      repairedAt: new Date("2026-08-01"),
      symptom: "จอแสดงผลมีเส้นแนวตั้ง",
      solution: "ส่งเปลี่ยนจอที่ศูนย์บริการ",
      cost: 3500,
      handledBy: "ร้านซ่อมคอมพิวเตอร์ ABC",
    },
  });

  await prisma.movement.create({
    data: {
      assetId: desktop.id,
      movedAt: new Date("2024-01-15"),
      fromOwner: null,
      toOwner: accounting.name,
      note: "รับเครื่องใหม่เข้าประจำแผนก",
    },
  });

  await prisma.movement.create({
    data: {
      assetId: printer.id,
      movedAt: new Date("2023-05-10"),
      fromOwner: accounting.name,
      toOwner: itDept.name,
      note: "ย้ายมาประจำห้องไอที",
    },
  });

  console.log("Seed data created:", {
    owners: 3,
    assets: [desktop.assetNumber, laptop.assetNumber, printer.assetNumber, oldServer.assetNumber],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
