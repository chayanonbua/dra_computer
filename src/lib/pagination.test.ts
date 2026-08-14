import { describe, expect, it } from "vitest";
import { getPageNumbers, paginate } from "./pagination";

const items = Array.from({ length: 45 }, (_, i) => i + 1); // [1..45]

describe("paginate", () => {
  it("แบ่งหน้าแรกได้ถูกต้องตามขนาดหน้าที่กำหนด", () => {
    const result = paginate(items, 1, 20);
    expect(result.items).toEqual(items.slice(0, 20));
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.totalItems).toBe(45);
  });

  it("แบ่งหน้ากลางได้ถูกต้อง", () => {
    const result = paginate(items, 2, 20);
    expect(result.items).toEqual(items.slice(20, 40));
    expect(result.currentPage).toBe(2);
  });

  it("หน้าสุดท้ายมีรายการไม่ครบหน้า (เศษ)", () => {
    const result = paginate(items, 3, 20);
    expect(result.items).toEqual(items.slice(40, 45));
    expect(result.items).toHaveLength(5);
    expect(result.currentPage).toBe(3);
    expect(result.totalPages).toBe(3);
  });

  it("จำนวนรายการพอดีกับขนาดหน้า ไม่มีหน้าเศษเกิน", () => {
    const exact = Array.from({ length: 40 }, (_, i) => i + 1);
    const result = paginate(exact, 2, 20);
    expect(result.totalPages).toBe(2);
    expect(result.items).toHaveLength(20);
  });

  it("ปรับหมายเลขหน้าที่มากเกินไปให้เป็นหน้าสุดท้ายโดยอัตโนมัติ", () => {
    const result = paginate(items, 999, 20);
    expect(result.currentPage).toBe(3);
    expect(result.items).toEqual(items.slice(40, 45));
  });

  it("ปรับหมายเลขหน้าที่น้อยกว่า 1 ให้เป็นหน้าแรกโดยอัตโนมัติ", () => {
    const result = paginate(items, 0, 20);
    expect(result.currentPage).toBe(1);
    expect(result.items).toEqual(items.slice(0, 20));

    const negative = paginate(items, -5, 20);
    expect(negative.currentPage).toBe(1);
  });

  it("รายการว่างเปล่ายังคงมีอย่างน้อย 1 หน้า", () => {
    const result = paginate([], 1, 20);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });

  it("รายการน้อยกว่าขนาดหน้าเดียว มีแค่ 1 หน้า", () => {
    const small = [1, 2, 3];
    const result = paginate(small, 1, 20);
    expect(result.totalPages).toBe(1);
    expect(result.items).toEqual(small);
  });

  it("แบ่งหน้าละ 10 รายการได้ถูกต้อง (ขนาดหน้าที่ใช้จริงในหน้ารายการครุภัณฑ์)", () => {
    const sixtyEight = Array.from({ length: 68 }, (_, i) => i + 1);

    const page1 = paginate(sixtyEight, 1, 10);
    expect(page1.items).toEqual(sixtyEight.slice(0, 10));
    expect(page1.totalPages).toBe(7);

    const page7 = paginate(sixtyEight, 7, 10);
    expect(page7.items).toEqual(sixtyEight.slice(60, 68));
    expect(page7.items).toHaveLength(8);
  });
});

describe("getPageNumbers", () => {
  it("แสดงเลขหน้าครบทุกหน้าเมื่อมีไม่เกิน 7 หน้า", () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("แสดงหน้าเดียวเมื่อมีข้อมูลหน้าเดียว", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });

  it("ตัดช่วงกลางด้วย ellipsis เมื่ออยู่หน้าแรกๆ ของหลายหน้า", () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, "ellipsis", 10]);
  });

  it("ตัดช่วงกลางด้วย ellipsis เมื่ออยู่หน้าสุดท้ายๆ ของหลายหน้า", () => {
    expect(getPageNumbers(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });

  it("แสดง ellipsis ทั้งสองฝั่งเมื่อหน้าปัจจุบันอยู่ตรงกลาง", () => {
    expect(getPageNumbers(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("ไม่แสดง ellipsis ซ้อนกันเมื่อหน้าปัจจุบันอยู่ติดขอบ (หน้า 2 หรือหน้าก่อนสุดท้าย)", () => {
    expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
    expect(getPageNumbers(9, 10)).toEqual([1, "ellipsis", 8, 9, 10]);
  });
});
