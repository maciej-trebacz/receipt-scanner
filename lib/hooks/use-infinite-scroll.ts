"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseInfiniteScrollOptions {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading more items */
  isLoading: boolean;
  /** Callback to load more items */
  onLoadMore: () => void;
  /** Root margin for IntersectionObserver (default: "200px") */
  rootMargin?: string;
}

/**
 * Hook for infinite scroll using IntersectionObserver.
 * Returns a ref callback to attach to a sentinel element at the bottom of the list.
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Don't observe if loading or no more items
      if (!node || !hasMore || isLoading) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            onLoadMore();
          }
        },
        { rootMargin }
      );

      observerRef.current.observe(node);
    },
    [hasMore, isLoading, onLoadMore, rootMargin]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { sentinelRef };
}
