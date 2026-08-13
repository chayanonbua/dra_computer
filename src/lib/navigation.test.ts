import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NAV_SECTIONS, getActiveHref, type NavLink } from "./navigation";

const allLinks: NavLink[] = NAV_SECTIONS.flatMap((section) => section.links);
const uniqueHrefs = Array.from(new Set(allLinks.map((link) => link.href)));

describe("getActiveHref", () => {
  it("matches an exact href", () => {
    expect(getActiveHref("/dashboard", allLinks)).toBe("/dashboard");
  });

  it("matches the asset list for its own path", () => {
    expect(getActiveHref("/assets", allLinks)).toBe("/assets");
  });

  it("matches the asset list (not 'add asset') for an asset detail page", () => {
    expect(getActiveHref("/assets/3", allLinks)).toBe("/assets");
  });

  it("matches the asset list (not 'add asset') for an asset edit page", () => {
    expect(getActiveHref("/assets/3/edit", allLinks)).toBe("/assets");
  });

  it("matches 'add asset' specifically for /assets/new, not the general list", () => {
    expect(getActiveHref("/assets/new", allLinks)).toBe("/assets/new");
  });

  it("matches the organization page", () => {
    expect(getActiveHref("/organization", allLinks)).toBe("/organization");
  });

  it("returns null when no link matches the current path", () => {
    expect(getActiveHref("/somewhere-else", allLinks)).toBeNull();
  });

  it("does not treat a merely similar path as a match (prefix must end at a segment boundary)", () => {
    expect(getActiveHref("/assets-archive", allLinks)).toBeNull();
  });
});

describe("NAV_SECTIONS", () => {
  it("has a route file backing every link, so nothing in the menu 404s", () => {
    for (const href of uniqueHrefs) {
      const pagePath = path.join(
        process.cwd(),
        "src",
        "app",
        ...href.split("/").filter(Boolean),
        "page.tsx"
      );
      expect(fs.existsSync(pagePath), `missing route file for ${href}: ${pagePath}`).toBe(true);
    }
  });

  it("gives every link a non-empty label and an absolute href", () => {
    for (const section of NAV_SECTIONS) {
      for (const link of section.links) {
        expect(link.label.trim().length).toBeGreaterThan(0);
        expect(link.href.startsWith("/")).toBe(true);
      }
    }
  });

  it("includes the dashboard as the first section", () => {
    expect(NAV_SECTIONS[0].links[0]).toEqual({ label: "แดชบอร์ด", href: "/dashboard" });
  });

  it("collapses organization management into a single link", () => {
    const orgLinks = allLinks.filter((link) => link.href === "/organization");
    expect(orgLinks).toHaveLength(1);
    expect(orgLinks[0].label).toBe("จัดการองค์กร/บุคลากร");
  });
});
