"use client";

import { useLocale } from "next-intl";

export function useFormatters() {
  const locale = useLocale();

  return {
    formatCurrency: (amount: number, currency: string = "PLN") => {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(amount);
    },

    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        ...options,
      }).format(new Date(date));
    },

    formatNumber: (num: number) => {
      return new Intl.NumberFormat(locale).format(num);
    },

    formatRelativeTime: (date: Date | string) => {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      const diff = Date.now() - new Date(date).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) return rtf.format(0, "day");
      if (days === 1) return rtf.format(-1, "day");
      if (days < 7) return rtf.format(-days, "day");
      if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
      return rtf.format(-Math.floor(days / 30), "month");
    },
  };
}
