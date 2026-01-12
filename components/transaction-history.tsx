import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: Date;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  showViewAll?: boolean;
}

const typeLabels: Record<string, string> = {
  signup_bonus: "Signup Bonus",
  purchase: "Purchase",
  usage: "Receipt Scan",
  refund: "Refund",
};

export function TransactionHistory({ transactions, showViewAll }: TransactionHistoryProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Transaction History</CardTitle>
        {showViewAll && (
          <Link
            href="/profile/transactions"
            className="text-sm text-primary hover:underline font-bold"
          >
            View All
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
              >
                <div>
                  <div className="font-bold">{typeLabels[tx.type] ?? tx.type}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div
                  className={cn(
                    "font-black text-lg",
                    tx.amount > 0 ? "text-green-600" : "text-red-500"
                  )}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
