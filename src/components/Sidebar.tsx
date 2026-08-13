"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, getActiveHref } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const allLinks = NAV_SECTIONS.flatMap((section) => section.links);
  const activeHref = getActiveHref(pathname, allLinks);

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 md:hidden">
        <span className="font-semibold">ระบบจัดเก็บครุภัณฑ์คอมพิวเตอร์</span>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? "ปิดเมนู" : "เปิดเมนู"}
          className="rounded p-2 hover:bg-gray-100"
        >
          {isOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 overflow-y-auto border-r border-gray-200 bg-white p-4 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hidden text-lg font-semibold md:block">
          ระบบจัดเก็บครุภัณฑ์คอมพิวเตอร์
        </div>

        <nav className="flex flex-col gap-5">
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`} className="flex flex-col gap-1">
              {section.label && (
                <p className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.label}
                </p>
              )}
              {section.links.map((link) => {
                const isActive = link.href === activeHref;
                return (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded px-3 py-2 text-sm ${
                      isActive
                        ? "bg-blue-100 font-medium text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
