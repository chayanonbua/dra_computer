import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // ทุกไฟล์ test ใช้ SQLite dev.db ไฟล์เดียวกันจริง (ไม่ mock)
    // รันพร้อมกันหลายไฟล์ทำให้เกิด race condition บนข้อมูลได้ จึงบังคับให้รันทีละไฟล์
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
