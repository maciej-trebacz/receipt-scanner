import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SuccessPage() {
  return (
    <div className="container max-w-md px-6 py-20">
      <Card className="glass-card text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <HugeiconsIcon icon={Tick02Icon} className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-black">
            Payment Successful!
          </CardTitle>
          <CardDescription className="text-base">
            Your credits have been added to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can now scan receipts using your new credits.
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild className="rounded-xl font-bold">
              <Link href="/dashboard">Start Scanning</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/profile">View Balance</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
