import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: blob: https://*.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev; style-src 'self' 'unsafe-inline'; frame-src https://js.stripe.com https://hooks.stripe.com https://*.clerk.accounts.dev; connect-src 'self' https://*.supabase.co https://*.clerk.accounts.dev wss://*.clerk.accounts.dev;",
          },
        ],
      },
    ];
  },
};

// Apply withWorkflow first, then withNextIntl
// Using any to work around type incompatibility between the two plugins
export default withNextIntl(withWorkflow(nextConfig) as any);
