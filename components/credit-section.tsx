import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Coins01Icon } from "@hugeicons/core-free-icons";

interface CreditSectionProps {
  credits: number;
}

export function CreditSection({ credits }: CreditSectionProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Credits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HugeiconsIcon icon={Coins01Icon} className="size-7 text-primary" />
            </div>
            <div>
              <div className="text-4xl font-black">{credits}</div>
              <div className="text-sm text-muted-foreground">credits available</div>
            </div>
          </div>
          <Button asChild className="rounded-xl font-bold">
            <Link href="/credits">Buy Credits</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
