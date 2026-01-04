"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Invoice01Icon,
  Analytics01Icon,
  Add01Icon,
  Invoice02Icon,
} from "@hugeicons/core-free-icons";

const navItems = [
  { href: "/", icon: Home01Icon, label: "Dashboard" },
  { href: "/receipts", icon: Invoice01Icon, label: "Receipts" },
  { href: "/reports", icon: Analytics01Icon, label: "Reports" },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:block sticky top-0 z-50">
      <div className="glass border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-5xl">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
              <HugeiconsIcon
                icon={Invoice02Icon}
                className="size-5 text-primary-foreground stroke-[2.5]"
              />
            </div>
            <span className="text-lg font-black tracking-tight">
              Receipt<span className="text-primary">Scanner</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <HugeiconsIcon
                    icon={item.icon}
                    className={cn("size-4", isActive && "stroke-[2.5]")}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Quick Scan CTA */}
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300 group"
          >
            <HugeiconsIcon
              icon={Add01Icon}
              className="size-4 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300"
            />
            New Scan
          </Link>
        </div>
      </div>
    </header>
  );
}
