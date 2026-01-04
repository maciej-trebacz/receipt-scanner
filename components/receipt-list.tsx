"use client";

import { useState, useMemo, useCallback } from "react";
import { ReceiptCard } from "./receipt-card";
import { DateGroupHeader } from "./date-group-header";
import { DateRangePicker } from "./date-range-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Invoice01Icon,
  Cancel01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import {
  useInfiniteReceipts,
  useReceipts,
  type DateRange,
} from "@/lib/hooks/use-receipts";
import { useReceiptUpdates } from "@/lib/hooks/use-receipt-updates";
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll";
import { groupReceiptsByDate } from "@/lib/date-groups";

interface ReceiptListProps {
  categoryId?: string;
  limit?: number;
  /** "full" shows grouping, filtering, infinite scroll. "compact" shows simple list. */
  variant?: "full" | "compact";
}

export function ReceiptList({
  categoryId,
  limit = 20,
  variant = "full",
}: ReceiptListProps) {
  // Use compact variant for simple list without features
  if (variant === "compact") {
    return <CompactReceiptList categoryId={categoryId} limit={limit} />;
  }

  return <FullReceiptList categoryId={categoryId} limit={limit} />;
}

/** Simple receipt list without grouping, filtering, or infinite scroll */
function CompactReceiptList({
  categoryId,
  limit,
}: {
  categoryId?: string;
  limit: number;
}) {
  const { data: receipts = [], isLoading: loading, error: queryError } = useReceipts({
    categoryId,
    limit,
  });

  // Enable SSE for processing receipts
  const processingIds = receipts
    .filter((r) => r.status === "pending" || r.status === "processing")
    .map((r) => r.id);
  useReceiptUpdates(
    processingIds.length > 0 ? processingIds : undefined,
    processingIds.length > 0
  );

  const error = queryError?.message ?? null;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(Math.min(limit, 3))].map((_, i) => (
          <div
            key={i}
            className="h-[100px] rounded-2xl bg-muted/30 animate-pulse border border-border/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 glass-card mx-auto max-w-sm">
        <div className="size-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
          <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
        </div>
        <h3 className="font-bold text-sm">Failed to load</h3>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12 glass-card mx-auto">
        <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 animate-float">
          <HugeiconsIcon icon={Invoice01Icon} className="size-7" />
        </div>
        <h3 className="font-black text-lg tracking-tight">No receipts yet</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Scan your first receipt to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {receipts.map((receipt) => (
        <ReceiptCard
          key={receipt.id}
          id={receipt.id}
          storeName={receipt.storeName}
          date={receipt.date}
          total={receipt.total}
          currency={receipt.currency}
          categoryName={receipt.categoryName}
          categoryColor={receipt.categoryColor}
          status={receipt.status}
          errorMessage={receipt.errorMessage}
        />
      ))}
    </div>
  );
}

/** Full receipt list with grouping, date filtering, and infinite scroll */
function FullReceiptList({
  categoryId,
  limit,
}: {
  categoryId?: string;
  limit: number;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });

  // Infinite query for paginated receipts
  const {
    data,
    isLoading: loading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteReceipts({
    categoryId,
    limit,
    dateRange,
  });

  // Flatten all pages into single array
  const receipts = useMemo(
    () => data?.pages.flatMap((page) => page.receipts) ?? [],
    [data]
  );

  // Enable SSE for processing receipts (incremental enhancement)
  const processingIds = receipts
    .filter((r) => r.status === "pending" || r.status === "processing")
    .map((r) => r.id);
  useReceiptUpdates(
    processingIds.length > 0 ? processingIds : undefined,
    processingIds.length > 0
  );

  // Group receipts by date
  const groupedReceipts = useMemo(
    () => groupReceiptsByDate(receipts),
    [receipts]
  );

  // Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: hasNextPage ?? false,
    isLoading: isFetchingNextPage,
    onLoadMore: handleLoadMore,
  });

  const error = queryError?.message ?? null;
  const hasFilter = dateRange.startDate || dateRange.endDate;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-[100px] rounded-2xl bg-muted/30 animate-pulse border border-border/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 glass-card mx-auto max-w-sm">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon icon={Cancel01Icon} className="size-6" />
        </div>
        <h3 className="font-bold text-lg">Failed to load</h3>
        <p className="text-sm text-muted-foreground mt-1 px-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters toolbar */}
      <div className="flex items-center gap-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Empty state */}
      {receipts.length === 0 && (
        <div className="text-center py-20 glass-card mx-auto max-w-sm">
          <div className="size-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 animate-float">
            <HugeiconsIcon icon={Invoice01Icon} className="size-10" />
          </div>
          <h3 className="font-black text-2xl tracking-tight">
            {hasFilter ? "No receipts found" : "No receipts yet"}
          </h3>
          <p className="text-muted-foreground mt-2 px-8">
            {hasFilter
              ? "Try adjusting your date filter to see more receipts."
              : "Scan your first receipt to start tracking your expenses in style."}
          </p>
        </div>
      )}

      {/* Grouped receipt list */}
      {receipts.length > 0 && (
        <div className="space-y-6">
          {Array.from(groupedReceipts.entries()).map(
            ([group, groupReceipts]) => (
              <div key={group}>
                <DateGroupHeader group={group} count={groupReceipts.length} />
                <div className="space-y-3">
                  {groupReceipts.map((receipt) => (
                    <ReceiptCard
                      key={receipt.id}
                      id={receipt.id}
                      storeName={receipt.storeName}
                      date={receipt.date}
                      total={receipt.total}
                      currency={receipt.currency}
                      categoryName={receipt.categoryName}
                      categoryColor={receipt.categoryColor}
                      status={receipt.status}
                      errorMessage={receipt.errorMessage}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasNextPage && (
        <div ref={sentinelRef} className="py-8 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-5 animate-spin"
              />
              <span className="text-sm font-medium">Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasNextPage && receipts.length > 0 && (
        <div className="text-center py-8 text-muted-foreground/60 text-xs font-medium">
          You have reached the end
        </div>
      )}
    </div>
  );
}
