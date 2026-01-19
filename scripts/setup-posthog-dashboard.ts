/**
 * Creates PostHog dashboard and insights for Paragone analytics
 * Run with: bun scripts/setup-posthog-dashboard.ts
 */

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
const API_HOST = POSTHOG_HOST.replace(".i.", ".");
const PERSONAL_KEY = process.env.POSTHOG_PERSONAL_KEY;

if (!PERSONAL_KEY) {
  console.error("Missing POSTHOG_PERSONAL_KEY in environment");
  process.exit(1);
}

async function posthogApi(endpoint: string, method: "GET" | "POST" | "PATCH" = "GET", body?: object) {
  const url = `${API_HOST}/api/projects/@current/${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${PERSONAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog API error ${res.status}: ${text}`);
  }

  return res.json();
}

async function createInsight(name: string, query: object, dashboardId: number) {
  console.log(`Creating insight: ${name}`);
  const insight = await posthogApi("insights/", "POST", {
    name,
    query: {
      kind: "InsightVizNode",
      source: query,
    },
    saved: true,
    dashboards: [dashboardId],
  });
  console.log(`  ✓ Created: ${API_HOST}/project/@current/insights/${insight.short_id}`);
  return insight;
}

async function main() {
  console.log("Setting up PostHog dashboard for Paragone...\n");

  // Create dashboard
  console.log("Creating dashboard: Analytics basics");
  const dashboard = await posthogApi("dashboards/", "POST", {
    name: "Analytics basics",
    description: "Core analytics for Paragone receipt scanner",
  });
  const dashboardId = dashboard.id;
  console.log(`✓ Dashboard created: ${API_HOST}/project/@current/dashboard/${dashboardId}\n`);

  // 1. Receipt scanning funnel
  await createInsight("Receipt scanning funnel", {
    kind: "FunnelsQuery",
    series: [
      { event: "receipt_uploaded", kind: "EventsNode" },
      { event: "receipt_scan_confirmed", kind: "EventsNode" },
      { event: "receipt_saved", kind: "EventsNode" },
    ],
    funnelsFilter: {
      funnelWindowInterval: 1,
      funnelWindowIntervalUnit: "day",
    },
    dateRange: { date_from: "-30d" },
  }, dashboardId);

  // 2. Credit purchase funnel
  await createInsight("Credit purchase funnel", {
    kind: "FunnelsQuery",
    series: [
      { event: "checkout_started", kind: "EventsNode" },
      { event: "credits_purchased", kind: "EventsNode" },
    ],
    funnelsFilter: {
      funnelWindowInterval: 1,
      funnelWindowIntervalUnit: "day",
    },
    dateRange: { date_from: "-30d" },
  }, dashboardId);

  // 3. Feature usage trends
  await createInsight("Feature usage over time", {
    kind: "TrendsQuery",
    series: [
      { event: "receipt_uploaded", kind: "EventsNode" },
      { event: "bulk_upload_started", kind: "EventsNode" },
      { event: "reports_viewed", kind: "EventsNode" },
    ],
    trendsFilter: { display: "ActionsLineGraph" },
    interval: "day",
    dateRange: { date_from: "-30d" },
  }, dashboardId);

  // 4. Processing success rate
  await createInsight("Processing success rate", {
    kind: "TrendsQuery",
    series: [
      { event: "receipt_processing_completed", kind: "EventsNode" },
      { event: "receipt_processing_failed", kind: "EventsNode" },
    ],
    trendsFilter: { display: "ActionsLineGraph" },
    interval: "day",
    dateRange: { date_from: "-30d" },
  }, dashboardId);

  // 5. User retention
  await createInsight("User retention (receipt saves)", {
    kind: "RetentionQuery",
    retentionFilter: {
      targetEntity: { id: "receipt_saved", type: "events" },
      returningEntity: { id: "receipt_saved", type: "events" },
      retentionType: "retention_first_time",
      totalIntervals: 8,
      period: "Week",
    },
    dateRange: { date_from: "-60d" },
  }, dashboardId);

  console.log("\n" + "=".repeat(60));
  console.log("Setup complete!");
  console.log(`Dashboard: ${API_HOST}/project/@current/dashboard/${dashboardId}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
