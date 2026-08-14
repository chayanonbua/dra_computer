import { describe, expect, it } from "vitest";
import { filterOrganizationTree } from "./organization-filter";
import type { OfficeNode } from "./organization";

const tree: OfficeNode[] = [
  {
    id: 1,
    name: "สำนักเทคโนโลยีสารสนเทศ",
    groups: [
      {
        id: 11,
        name: "กลุ่มพัฒนาระบบ",
        people: [
          { id: 111, name: "สมชาย ใจดี" },
          { id: 112, name: "สมหญิง รักเรียน" },
        ],
      },
      {
        id: 12,
        name: "กลุ่มเครือข่าย",
        people: [{ id: 121, name: "วิชัย มั่นคง" }],
      },
    ],
  },
  {
    id: 2,
    name: "สำนักบริหารทั่วไป",
    groups: [
      {
        id: 21,
        name: "กลุ่มสารบรรณ",
        people: [{ id: 211, name: "สมชาย ทองดี" }],
      },
    ],
  },
];

describe("filterOrganizationTree", () => {
  it("คืนต้นไม้ทั้งหมดเมื่อไม่มีคำค้นหาและไม่กรองสำนัก", () => {
    expect(filterOrganizationTree(tree, "", null)).toEqual(tree);
  });

  it("กรองเฉพาะสำนักที่เลือกเมื่อไม่มีคำค้นหา", () => {
    const result = filterOrganizationTree(tree, "", 2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it("เมื่อค้นหาชื่อบุคคล ให้แสดงเฉพาะบุคคลที่ตรงภายใต้กลุ่ม/สำนักของเขา", () => {
    const result = filterOrganizationTree(tree, "สมชาย", null);
    expect(result).toHaveLength(2);

    const office1 = result.find((o) => o.id === 1)!;
    expect(office1.groups).toHaveLength(1);
    expect(office1.groups[0].id).toBe(11);
    expect(office1.groups[0].people.map((p) => p.name)).toEqual(["สมชาย ใจดี"]);

    const office2 = result.find((o) => o.id === 2)!;
    expect(office2.groups[0].people.map((p) => p.name)).toEqual(["สมชาย ทองดี"]);
  });

  it("เมื่อค้นหาชื่อกลุ่มที่ตรง ให้แสดงทั้งกลุ่มโดยไม่กรองบุคคลย่อย", () => {
    const result = filterOrganizationTree(tree, "เครือข่าย", null);
    expect(result).toHaveLength(1);
    expect(result[0].groups).toHaveLength(1);
    expect(result[0].groups[0].people).toHaveLength(1);
  });

  it("เมื่อค้นหาชื่อสำนักที่ตรง ให้แสดงทั้งสำนักโดยไม่กรองกลุ่ม/บุคคลย่อย", () => {
    const result = filterOrganizationTree(tree, "เทคโนโลยี", null);
    expect(result).toHaveLength(1);
    expect(result[0].groups).toHaveLength(2);
  });

  it("ค้นหาแบบไม่สนใจตัวพิมพ์เล็กใหญ่ (ภาษาอังกฤษ)", () => {
    const englishTree: OfficeNode[] = [
      { id: 9, name: "IT Office", groups: [{ id: 91, name: "Dev Team", people: [{ id: 911, name: "John Doe" }] }] },
    ];
    expect(filterOrganizationTree(englishTree, "john", null)).toHaveLength(1);
    expect(filterOrganizationTree(englishTree, "JOHN", null)).toHaveLength(1);
  });

  it("คืนอาเรย์ว่างเมื่อไม่มีสิ่งใดตรงกับคำค้นหา", () => {
    expect(filterOrganizationTree(tree, "ไม่มีอยู่จริง", null)).toEqual([]);
  });

  it("รวมคำค้นหาและฟิลเตอร์สำนักเข้าด้วยกัน", () => {
    const result = filterOrganizationTree(tree, "สมชาย", 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});
