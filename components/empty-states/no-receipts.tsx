import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Invoice02Icon } from "@hugeicons/core-free-icons";

export function NoReceipts() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <HugeiconsIcon icon={Invoice02Icon} className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No receipts yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Scan your first receipt to start tracking expenses
      </p>
      <Button asChild>
        <Link href="/">Scan Receipt</Link>
      </Button>
    </div>
  );
}
