import type { OfficeNode } from "./organization";

/**
 * กรองต้นไม้โครงสร้างองค์กรตามคำค้นหา (ชื่อสำนัก/กลุ่ม/บุคคล) และสำนักที่เลือก
 * - หากสำนักหรือกลุ่มตรงกับคำค้นหาโดยตรง จะแสดงทั้งกิ่งนั้น (ไม่กรองบุคคลย่อยลงไปอีก)
 * - หากมีเฉพาะบุคคลที่ตรง จะแสดงเฉพาะบุคคลนั้นภายใต้กลุ่ม/สำนักของเขา
 */
export function filterOrganizationTree(
  tree: OfficeNode[],
  searchTerm: string,
  officeId: number | null
): OfficeNode[] {
  const term = searchTerm.trim().toLowerCase();

  const scoped = tree.filter((office) => officeId === null || office.id === officeId);
  if (!term) return scoped;

  const result: OfficeNode[] = [];

  for (const office of scoped) {
    const officeMatches = office.name.toLowerCase().includes(term);
    const groups: OfficeNode["groups"] = [];

    for (const group of office.groups) {
      const groupMatches = group.name.toLowerCase().includes(term);

      if (officeMatches || groupMatches) {
        groups.push(group);
        continue;
      }

      const people = group.people.filter((person) =>
        person.name.toLowerCase().includes(term)
      );
      if (people.length > 0) {
        groups.push({ ...group, people });
      }
    }

    if (officeMatches || groups.length > 0) {
      result.push({ ...office, groups });
    }
  }

  return result;
}
