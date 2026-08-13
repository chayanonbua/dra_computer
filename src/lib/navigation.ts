export interface NavLink {
  label: string;
  href: string;
}

export interface NavSection {
  label: string | null;
  links: NavLink[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    links: [{ label: "แดชบอร์ด", href: "/dashboard" }],
  },
  {
    label: "ครุภัณฑ์",
    links: [
      { label: "รายการครุภัณฑ์ทั้งหมด", href: "/assets" },
      { label: "เพิ่มครุภัณฑ์", href: "/assets/new" },
    ],
  },
  {
    label: null,
    links: [{ label: "จัดการองค์กร/บุคลากร", href: "/organization" }],
  },
];

// หา href ที่ตรงกับหน้าปัจจุบันมากที่สุด (เจาะจงที่สุดชนะ) สำหรับใช้ไฮไลต์เมนู
// เช่น pathname "/assets/new" ต้องไฮไลต์ "เพิ่มครุภัณฑ์" ไม่ใช่ "รายการครุภัณฑ์ทั้งหมด"
// แม้ href ทั้งสองจะ match แบบ prefix ก็ตาม
export function getActiveHref(pathname: string, links: NavLink[]): string | null {
  const matches = links
    .map((link) => link.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`));

  if (matches.length === 0) return null;

  return matches.reduce((longest, current) =>
    current.length > longest.length ? current : longest
  );
}
