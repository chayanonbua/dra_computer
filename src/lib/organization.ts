import { prisma } from "./prisma";

export interface OfficeSummary {
  id: number;
  name: string;
}

export interface GroupSummary {
  id: number;
  name: string;
  officeId: number;
  officeName: string;
}

export interface PersonSummary {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
}

export interface PersonNode {
  id: number;
  name: string;
}

export interface GroupNode {
  id: number;
  name: string;
  people: PersonNode[];
}

export interface OfficeNode {
  id: number;
  name: string;
  groups: GroupNode[];
}

export async function getOrganizationTree(): Promise<OfficeNode[]> {
  const offices = await prisma.office.findMany({
    orderBy: { name: "asc" },
    include: {
      groups: {
        orderBy: { name: "asc" },
        include: {
          people: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  return offices.map((office) => ({
    id: office.id,
    name: office.name,
    groups: office.groups.map((group) => ({
      id: group.id,
      name: group.name,
      people: group.people.map((person) => ({ id: person.id, name: person.name })),
    })),
  }));
}

export async function getOffices(): Promise<OfficeSummary[]> {
  const offices = await prisma.office.findMany({ orderBy: { name: "asc" } });
  return offices.map((o) => ({ id: o.id, name: o.name }));
}

export async function getGroups(): Promise<GroupSummary[]> {
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { office: true },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    officeId: g.officeId,
    officeName: g.office.name,
  }));
}

export interface MovementDestinationOption {
  type: "group" | "person";
  id: number;
  name: string;
  contextLabel: string;
}

export async function getMovementDestinationOptions(): Promise<MovementDestinationOption[]> {
  const [groups, people] = await Promise.all([
    prisma.group.findMany({ orderBy: { name: "asc" }, include: { office: true } }),
    prisma.person.findMany({ orderBy: { name: "asc" }, include: { group: true } }),
  ]);

  const groupOptions: MovementDestinationOption[] = groups.map((g) => ({
    type: "group",
    id: g.id,
    name: g.name,
    contextLabel: g.office.name,
  }));

  const personOptions: MovementDestinationOption[] = people.map((p) => ({
    type: "person",
    id: p.id,
    name: p.name,
    contextLabel: p.group.name,
  }));

  return [...groupOptions, ...personOptions];
}

function validateName(name: string, label: string): string | null {
  if (!name || !name.trim()) return `กรุณาระบุชื่อ${label}`;
  return null;
}

// ---- สำนัก ----

export async function createOffice(name: string) {
  const error = validateName(name, "สำนัก");
  if (error) throw new Error(error);
  return prisma.office.create({ data: { name: name.trim() } });
}

export async function updateOffice(id: number, name: string) {
  const error = validateName(name, "สำนัก");
  if (error) throw new Error(error);

  const office = await prisma.office.findUnique({ where: { id } });
  if (!office) throw new Error("ไม่พบสำนักที่ต้องการแก้ไข");

  return prisma.office.update({ where: { id }, data: { name: name.trim() } });
}

export async function deleteOffice(id: number) {
  const office = await prisma.office.findUnique({
    where: { id },
    include: { groups: true },
  });
  if (!office) throw new Error("ไม่พบสำนักที่ต้องการลบ");

  if (office.groups.length > 0) {
    throw new Error(
      `ไม่สามารถลบสำนัก "${office.name}" ได้ เนื่องจากยังมีกลุ่มอยู่ภายใต้สำนักนี้ ${office.groups.length} กลุ่ม กรุณาลบหรือย้ายกลุ่มออกก่อน`
    );
  }

  return prisma.office.delete({ where: { id } });
}

// ---- กลุ่ม ----

export async function createGroup(name: string, officeId: number) {
  const nameError = validateName(name, "กลุ่ม");
  if (nameError) throw new Error(nameError);
  if (!Number.isInteger(officeId)) throw new Error("กรุณาเลือกสำนักที่สังกัด");

  const office = await prisma.office.findUnique({ where: { id: officeId } });
  if (!office) throw new Error("ไม่พบสำนักที่เลือก");

  return prisma.group.create({ data: { name: name.trim(), officeId } });
}

export async function updateGroup(id: number, name: string, officeId: number) {
  const nameError = validateName(name, "กลุ่ม");
  if (nameError) throw new Error(nameError);
  if (!Number.isInteger(officeId)) throw new Error("กรุณาเลือกสำนักที่สังกัด");

  const [group, office] = await Promise.all([
    prisma.group.findUnique({ where: { id } }),
    prisma.office.findUnique({ where: { id: officeId } }),
  ]);
  if (!group) throw new Error("ไม่พบกลุ่มที่ต้องการแก้ไข");
  if (!office) throw new Error("ไม่พบสำนักที่เลือก");

  return prisma.group.update({ where: { id }, data: { name: name.trim(), officeId } });
}

export async function deleteGroup(id: number) {
  const group = await prisma.group.findUnique({
    where: { id },
    include: { people: true, assetsAsOwner: true },
  });
  if (!group) throw new Error("ไม่พบกลุ่มที่ต้องการลบ");

  if (group.people.length > 0) {
    throw new Error(
      `ไม่สามารถลบกลุ่ม "${group.name}" ได้ เนื่องจากยังมีบุคคลอยู่ในกลุ่มนี้ ${group.people.length} คน กรุณาลบหรือย้ายบุคคลออกก่อน`
    );
  }
  if (group.assetsAsOwner.length > 0) {
    throw new Error(
      `ไม่สามารถลบกลุ่ม "${group.name}" ได้ เนื่องจากยังมีครุภัณฑ์ที่ถือครองโดยกลุ่มนี้อยู่ ${group.assetsAsOwner.length} รายการ กรุณาย้ายครุภัณฑ์ออกก่อน`
    );
  }

  return prisma.group.delete({ where: { id } });
}

// ---- บุคคล ----

export async function createPerson(name: string, groupId: number) {
  const nameError = validateName(name, "บุคคล");
  if (nameError) throw new Error(nameError);
  if (!Number.isInteger(groupId)) throw new Error("กรุณาเลือกกลุ่มที่สังกัด");

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("ไม่พบกลุ่มที่เลือก");

  return prisma.person.create({ data: { name: name.trim(), groupId } });
}

export async function updatePerson(id: number, name: string, groupId: number) {
  const nameError = validateName(name, "บุคคล");
  if (nameError) throw new Error(nameError);
  if (!Number.isInteger(groupId)) throw new Error("กรุณาเลือกกลุ่มที่สังกัด");

  const [person, group] = await Promise.all([
    prisma.person.findUnique({ where: { id } }),
    prisma.group.findUnique({ where: { id: groupId } }),
  ]);
  if (!person) throw new Error("ไม่พบบุคคลที่ต้องการแก้ไข");
  if (!group) throw new Error("ไม่พบกลุ่มที่เลือก");

  return prisma.person.update({ where: { id }, data: { name: name.trim(), groupId } });
}

export async function deletePerson(id: number) {
  const person = await prisma.person.findUnique({
    where: { id },
    include: { assetsAsOwner: true },
  });
  if (!person) throw new Error("ไม่พบบุคคลที่ต้องการลบ");

  if (person.assetsAsOwner.length > 0) {
    throw new Error(
      `ไม่สามารถลบ "${person.name}" ได้ เนื่องจากยังมีครุภัณฑ์ที่ถือครองอยู่ ${person.assetsAsOwner.length} รายการ กรุณาย้ายครุภัณฑ์ออกก่อน`
    );
  }

  return prisma.person.delete({ where: { id } });
}
