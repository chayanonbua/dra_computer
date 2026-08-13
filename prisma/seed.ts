import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminOffice = await prisma.office.create({
    data: { name: "สำนักงานเลขานุการกรม" },
  });
  const technicalOffice = await prisma.office.create({
    data: { name: "สำนักเทคโนโลยีสารสนเทศ" },
  });

  const [financeGroup, itGroup, personnelGroup] = await Promise.all([
    prisma.group.create({
      data: { name: "กลุ่มการเงินและบัญชี", officeId: adminOffice.id },
    }),
    prisma.group.create({
      data: { name: "กลุ่มพัฒนาระบบ", officeId: technicalOffice.id },
    }),
    prisma.group.create({
      data: { name: "กลุ่มการเจ้าหน้าที่", officeId: adminOffice.id },
    }),
  ]);

  const somchai = await prisma.person.create({
    data: { name: "สมชาย ใจดี", groupId: personnelGroup.id },
  });

  const desktop = await prisma.asset.create({
    data: {
      assetNumber: "COMP-2024-001",
      name: "คอมพิวเตอร์ตั้งโต๊ะ",
      brand: "Dell",
      model: "OptiPlex 7010",
      status: "active",
      acquiredAt: new Date("2024-01-15"),
      currentGroupId: financeGroup.id,
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
      currentPersonId: somchai.id,
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
      currentGroupId: itGroup.id,
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
      disposedAt: new Date("2026-02-01"),
      disposalReason: "ครบอายุการใช้งาน",
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
      toOwner: financeGroup.name,
      note: "รับเครื่องใหม่เข้าประจำแผนก",
    },
  });

  await prisma.movement.create({
    data: {
      assetId: printer.id,
      movedAt: new Date("2023-05-10"),
      fromOwner: financeGroup.name,
      toOwner: itGroup.name,
      note: "ย้ายมาประจำห้องไอที",
    },
  });

  console.log("Seed data created:", {
    offices: 2,
    groups: 3,
    people: 1,
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
