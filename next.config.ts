import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

// Apply withWorkflow first, then withNextIntl
// Using any to work around type incompatibility between the two plugins
export default withNextIntl(withWorkflow(nextConfig) as any);
