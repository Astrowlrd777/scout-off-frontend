# Deployment Guide

## Vercel Analytics

This project now includes Vercel Analytics in the root layout.

- The `Analytics` component is rendered in `app/layout.tsx` so page views are tracked automatically.
- `WebVitalsReporter` (`components/WebVitalsReporter.tsx`) uses the `web-vitals` package to report real-user LCP, CLS, INP, and TTFB as custom Vercel Analytics events (`Web Vitals: <name>`), so field data can be compared against the synthetic Lighthouse CI scores.
- Each event is tagged with `route` — the page's route pattern (e.g. `/[locale]/player/[id]`) computed via `@vercel/analytics`'s `computeRoute`, not the literal URL — so regressions can be traced to a specific page without ever sending a dynamic segment (which can be a Stellar wallet address) to analytics.
- Analytics and Web Vitals reporting are disabled when `NODE_ENV=test` to avoid polluting test data.
- No wallet addresses or other PII are passed to Vercel Analytics because only pageview, performance, and route-pattern data are tracked.

## Environment variables

Add the following variable to `.env.local` or your deployment environment:

```env
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=<your-vercel-analytics-id>
```

If you are deploying to Vercel, also set `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` in your project environment variables.

### Indexer

```env
INDEXER_API_URL_INTERNAL=http://indexer.internal:3001
```

`INDEXER_API_URL_INTERNAL` is a server-only URL for the event indexer (`packages/indexer`). Browsers never call the indexer directly. They go through the same-origin proxy at `/api/indexer/*`, which forwards only the allow-listed query routes, rate-limits per IP and adds a short `Cache-Control` to public GETs. The indexer can therefore stay on a private network with no CORS configuration. `NEXT_PUBLIC_INDEXER_API_URL` is still read as a fallback but is deprecated.

## Notes

- Do not include wallet addresses in any custom analytics events.
- The app only uses Vercel Analytics for standard pageviews and Web Vitals, not custom PII events.
