"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale after 30 seconds
            staleTime: 30 * 1000,
            // Keep in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Refetch on window focus (good for returning users)
            refetchOnWindowFocus: true,
            // Don't retry too aggressively
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
