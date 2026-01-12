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
  UserCircleIcon,
  Coins01Icon,
} from "@hugeicons/core-free-icons";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { href: "/", icon: Home01Icon, label: "Home" },
  { href: "/receipts", icon: Invoice01Icon, label: "Receipts" },
  { href: "/reports", icon: Analytics01Icon, label: "Reports" },
  { href: "/profile", icon: UserCircleIcon, label: "Profile" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: creditData } = useQuery({
    queryKey: ["credits"],
    queryFn: () => fetch("/api/credits").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const credits = creditData?.credits ?? 0;
  const isEmpty = credits === 0;
  const isLow = credits < 3;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden">
      <nav className="glass h-16 w-full max-w-md rounded-2xl flex items-center justify-between px-2 shadow-2xl">
        {navItems.slice(0, 2).map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all duration-300",
                isActive
                  ? "text-primary scale-110"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                className={cn("size-5", isActive && "stroke-[2.5]")}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}

        {/* Central Scan FAB with credit badge */}
        <Link
          href="/"
          className="relative -mt-12 flex items-center justify-center size-16 bg-primary rounded-2xl shadow-xl shadow-primary/40 border-4 border-background transition-transform duration-300 hover:scale-110 active:scale-95 group"
        >
          <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <HugeiconsIcon icon={Add01Icon} className="size-8 text-primary-foreground stroke-[3]" />
          {/* Credit badge */}
          <div
            className={cn(
              "absolute -top-2 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg",
              isEmpty && "bg-destructive text-white",
              isLow && !isEmpty && "bg-amber-500 text-white",
              !isLow && "bg-background text-primary border border-primary/20"
            )}
          >
            <HugeiconsIcon icon={Coins01Icon} className="size-3" />
            {credits}
          </div>
        </Link>

        {navItems.slice(2).map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all duration-300",
                isActive
                  ? "text-primary scale-110"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                className={cn("size-5", isActive && "stroke-[2.5]")}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
