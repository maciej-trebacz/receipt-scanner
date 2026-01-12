import { Card, CardContent } from "@/components/ui/card";

export function ReceiptCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ReceiptListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" data-testid="receipt-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <ReceiptCardSkeleton key={i} />
      ))}
    </div>
  );
}
