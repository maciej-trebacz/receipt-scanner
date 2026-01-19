"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Invoice01Icon,
  Analytics01Icon,
  Add01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { CreditBalance } from "./credit-balance";

const navItems = [
  { href: "/dashboard", icon: Home01Icon, label: "Dashboard" },
  { href: "/receipts", icon: Invoice01Icon, label: "Receipts" },
  { href: "/reports", icon: Analytics01Icon, label: "Reports" },
  { href: "/profile", icon: UserCircleIcon, label: "Profile" },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden md:block sticky top-0 z-50">
      <div className="glass border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-5xl">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo-64.png"
              alt="Paragone"
              width={28}
              height={28}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-lg font-black tracking-tight">
              Para<span className="text-primary">gone</span>
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

          {/* Right side: Scan CTA + Auth */}
          <div className="flex items-center gap-4">
            <SignedIn>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300 group"
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-4 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300"
                />
                New Scan
              </Link>
              <CreditBalance />
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
              >
                Get Started
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}
