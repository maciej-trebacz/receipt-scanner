"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Coins01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function CreditBalance() {
  const { data, isLoading } = useQuery({
    queryKey: ["credits"],
    queryFn: () => fetch("/api/credits").then((r) => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="h-6 w-14 animate-pulse bg-muted rounded-full" />;
  }

  const credits = data?.credits ?? 0;
  const isLow = credits < 3;
  const isEmpty = credits === 0;

  return (
    <Link
      href="/credits"
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold transition-all hover:scale-105",
        isEmpty && "bg-destructive/10 text-destructive hover:bg-destructive/20",
        isLow && !isEmpty && "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
        !isLow && "bg-primary/10 text-primary hover:bg-primary/20"
      )}
    >
      <HugeiconsIcon icon={Coins01Icon} className="size-4" />
      <span>{credits}</span>
      {isEmpty && <span className="text-xs font-medium">(empty)</span>}
    </Link>
  );
}
