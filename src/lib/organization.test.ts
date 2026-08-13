import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  createGroup,
  createOffice,
  createPerson,
  deleteGroup,
  deleteOffice,
  deletePerson,
  getOrganizationTree,
  updateGroup,
  updateOffice,
  updatePerson,
} from "./organization";

// เก็บ id ที่สร้างระหว่างเทสไว้ล้างทิ้งหลังแต่ละเทส กันข้อมูลตกค้าง
const createdOfficeIds: number[] = [];
const createdGroupIds: number[] = [];
const createdPersonIds: number[] = [];
const createdAssetIds: number[] = [];

afterEach(async () => {
  if (createdAssetIds.length) {
    await prisma.asset.deleteMany({ where: { id: { in: createdAssetIds } } });
    createdAssetIds.length = 0;
  }
  if (createdPersonIds.length) {
    await prisma.person.deleteMany({ where: { id: { in: createdPersonIds } } });
    createdPersonIds.length = 0;
  }
  if (createdGroupIds.length) {
    await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
    createdGroupIds.length = 0;
  }
  if (createdOfficeIds.length) {
    await prisma.office.deleteMany({ where: { id: { in: createdOfficeIds } } });
    createdOfficeIds.length = 0;
  }
});

async function makeOffice(name: string) {
  const office = await createOffice(name);
  createdOfficeIds.push(office.id);
  return office;
}

async function makeGroup(name: string, officeId: number) {
  const group = await createGroup(name, officeId);
  createdGroupIds.push(group.id);
  return group;
}

async function makePerson(name: string, groupId: number) {
  const person = await createPerson(name, groupId);
  createdPersonIds.push(person.id);
  return person;
}

describe("hierarchy creation", () => {
  it("creates a group correctly linked to its office", async () => {
    const office = await makeOffice("สำนักทดสอบ A");
    const group = await makeGroup("กลุ่มทดสอบ A", office.id);

    expect(group.officeId).toBe(office.id);
  });

  it("creates a person correctly linked to their group", async () => {
    const office = await makeOffice("สำนักทดสอบ B");
    const group = await makeGroup("กลุ่มทดสอบ B", office.id);
    const person = await makePerson("บุคคลทดสอบ B", group.id);

    expect(person.groupId).toBe(group.id);
  });

  it("reflects the full hierarchy in getOrganizationTree", async () => {
    const office = await makeOffice("สำนักทดสอบ C");
    const group = await makeGroup("กลุ่มทดสอบ C", office.id);
    await makePerson("บุคคลทดสอบ C", group.id);

    const tree = await getOrganizationTree();
    const officeNode = tree.find((o) => o.id === office.id);
    expect(officeNode).toBeDefined();
    expect(officeNode?.groups).toHaveLength(1);
    expect(officeNode?.groups[0].name).toBe("กลุ่มทดสอบ C");
    expect(officeNode?.groups[0].people).toHaveLength(1);
    expect(officeNode?.groups[0].people[0].name).toBe("บุคคลทดสอบ C");
  });

  it("rejects creating a group under an office that does not exist", async () => {
    await expect(createGroup("กลุ่มกำพร้า", 999999)).rejects.toThrow();
  });

  it("rejects creating a person under a group that does not exist", async () => {
    await expect(createPerson("บุคคลกำพร้า", 999999)).rejects.toThrow();
  });

  it("moves a group to a different office via updateGroup", async () => {
    const officeA = await makeOffice("สำนักทดสอบ D1");
    const officeB = await makeOffice("สำนักทดสอบ D2");
    const group = await makeGroup("กลุ่มทดสอบ D", officeA.id);

    const updated = await updateGroup(group.id, group.name, officeB.id);
    expect(updated.officeId).toBe(officeB.id);
  });

  it("moves a person to a different group via updatePerson", async () => {
    const office = await makeOffice("สำนักทดสอบ E");
    const groupA = await makeGroup("กลุ่มทดสอบ E1", office.id);
    const groupB = await makeGroup("กลุ่มทดสอบ E2", office.id);
    const person = await makePerson("บุคคลทดสอบ E", groupA.id);

    const updated = await updatePerson(person.id, person.name, groupB.id);
    expect(updated.groupId).toBe(groupB.id);
  });

  it("renames an office via updateOffice", async () => {
    const office = await makeOffice("สำนักทดสอบ F (เดิม)");
    const updated = await updateOffice(office.id, "สำนักทดสอบ F (ใหม่)");
    expect(updated.name).toBe("สำนักทดสอบ F (ใหม่)");
  });
});

describe("delete guards prevent orphaned data", () => {
  it("blocks deleting an office that still has groups under it", async () => {
    const office = await makeOffice("สำนักทดสอบ G");
    await makeGroup("กลุ่มทดสอบ G", office.id);

    await expect(deleteOffice(office.id)).rejects.toThrow(/กลุ่ม/);

    const stillExists = await prisma.office.findUnique({ where: { id: office.id } });
    expect(stillExists).not.toBeNull();
  });

  it("allows deleting an office once its groups are gone", async () => {
    const office = await makeOffice("สำนักทดสอบ H");
    const group = await makeGroup("กลุ่มทดสอบ H", office.id);

    await deleteGroup(group.id);
    createdGroupIds.splice(createdGroupIds.indexOf(group.id), 1);

    await expect(deleteOffice(office.id)).resolves.toBeDefined();
    createdOfficeIds.splice(createdOfficeIds.indexOf(office.id), 1);
  });

  it("blocks deleting a group that still has people in it", async () => {
    const office = await makeOffice("สำนักทดสอบ I");
    const group = await makeGroup("กลุ่มทดสอบ I", office.id);
    await makePerson("บุคคลทดสอบ I", group.id);

    await expect(deleteGroup(group.id)).rejects.toThrow(/บุคคล/);

    const stillExists = await prisma.group.findUnique({ where: { id: group.id } });
    expect(stillExists).not.toBeNull();
  });

  it("blocks deleting a group that directly holds an asset", async () => {
    const office = await makeOffice("สำนักทดสอบ J");
    const group = await makeGroup("กลุ่มทดสอบ J", office.id);
    const asset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-ORG-GROUP-ASSET",
        name: "เครื่องทดสอบถือครองโดยกลุ่ม",
        status: "active",
        currentGroupId: group.id,
      },
    });
    createdAssetIds.push(asset.id);

    await expect(deleteGroup(group.id)).rejects.toThrow(/ครุภัณฑ์/);

    const stillExists = await prisma.group.findUnique({ where: { id: group.id } });
    expect(stillExists).not.toBeNull();
  });

  it("blocks deleting a person who directly holds an asset", async () => {
    const office = await makeOffice("สำนักทดสอบ K");
    const group = await makeGroup("กลุ่มทดสอบ K", office.id);
    const person = await makePerson("บุคคลทดสอบ K", group.id);
    const asset = await prisma.asset.create({
      data: {
        assetNumber: "TEST-ORG-PERSON-ASSET",
        name: "เครื่องทดสอบถือครองโดยบุคคล",
        status: "active",
        currentPersonId: person.id,
      },
    });
    createdAssetIds.push(asset.id);

    await expect(deletePerson(person.id)).rejects.toThrow(/ครุภัณฑ์/);

    const stillExists = await prisma.person.findUnique({ where: { id: person.id } });
    expect(stillExists).not.toBeNull();
  });

  it("allows deleting a person once they hold no assets", async () => {
    const office = await makeOffice("สำนักทดสอบ L");
    const group = await makeGroup("กลุ่มทดสอบ L", office.id);
    const person = await makePerson("บุคคลทดสอบ L", group.id);

    await expect(deletePerson(person.id)).resolves.toBeDefined();
    createdPersonIds.splice(createdPersonIds.indexOf(person.id), 1);
  });

  it("throws when deleting an office/group/person id that does not exist", async () => {
    await expect(deleteOffice(999999)).rejects.toThrow();
    await expect(deleteGroup(999999)).rejects.toThrow();
    await expect(deletePerson(999999)).rejects.toThrow();
  });
});
