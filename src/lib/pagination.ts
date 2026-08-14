export interface PaginationResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

/**
 * แบ่งรายการเป็นหน้าๆ ตามขนาดหน้าที่กำหนด
 * - จำนวนหน้าอย่างน้อย 1 หน้าเสมอ แม้รายการจะว่างเปล่า
 * - หากขอหน้าที่อยู่นอกช่วง (น้อยกว่า 1 หรือมากกว่าหน้าสุดท้าย) จะปรับให้อยู่ในช่วงที่ถูกต้องให้อัตโนมัติ
 */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
    totalItems,
  };
}

export type PageNumberEntry = number | "ellipsis";

/**
 * สร้างรายการปุ่มเลขหน้าที่ควรแสดง (ตัดช่วงกลางด้วย "ellipsis" เมื่อมีหน้าเยอะ)
 * เสมอแสดงหน้าแรก, หน้าสุดท้าย, หน้าปัจจุบัน และหน้าติดกันข้างละ 1 หน้า
 */
export function getPageNumbers(currentPage: number, totalPages: number): PageNumberEntry[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const keep = new Set<number>([1, totalPages, currentPage]);
  if (currentPage - 1 >= 1) keep.add(currentPage - 1);
  if (currentPage + 1 <= totalPages) keep.add(currentPage + 1);

  const sorted = Array.from(keep).sort((a, b) => a - b);
  const result: PageNumberEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(sorted[i]);
  }
  return result;
}
