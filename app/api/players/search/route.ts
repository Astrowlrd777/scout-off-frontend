import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createRequestLogger } from '@/lib/logger';

/**
 * GET /api/players/search?name=...
 *
 * Proxies player name search to the off-chain backend (NEXT_PUBLIC_API_URL)
 * and rate limits per client IP. Typeahead search sends a request per
 * keystroke — the existing 300ms useDebounce in ScoutDashboardContent
 * already cuts that down client-side, but debouncing is not a security
 * boundary (it's trivially bypassable by calling the endpoint directly), so
 * this is the actual defense against abuse or a runaway client.
 *
 * Rate limiting: max 20 searches per IP per 10 seconds. When exceeded,
 * responds with 429 Too Many Requests and a Retry-After header.
 *
 * Real client IP is extracted from the x-forwarded-for header, same
 * convention as app/api/ipfs/upload/route.ts.
 */
const RATE_LIMIT = 20;
const WINDOW_MS = 10 * 1000;

type RateEntry = { count: number; firstSeen: number };
const ipRateMap = new Map<string, RateEntry>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function checkRateLimit(ip: string): {
  limited: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const entry = ipRateMap.get(ip);
  if (!entry) {
    ipRateMap.set(ip, { count: 1, firstSeen: now });
    return { limited: false };
  }

  if (now - entry.firstSeen > WINDOW_MS) {
    ipRateMap.set(ip, { count: 1, firstSeen: now });
    return { limited: false };
  }

  entry.count += 1;
  ipRateMap.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    const retryAfterSec = Math.ceil(
      (WINDOW_MS - (now - entry.firstSeen)) / 1000,
    );
    return { limited: true, retryAfterSec };
  }

  return { limited: false };
}

const backend = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});

export async function GET(req: NextRequest) {
  const log = createRequestLogger(req);
  const ip = getClientIp(req);

  const rl = checkRateLimit(ip);
  if (rl.limited) {
    log.warn('Rate limit exceeded', { ip });
    const retryAfter = rl.retryAfterSec ?? Math.ceil(WINDOW_MS / 1000);
    return NextResponse.json(
      { error: 'Too many search requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const name = req.nextUrl.searchParams.get('name') ?? '';

  try {
    const res = await backend.get('/players/search', { params: { name } });
    return NextResponse.json(res.data);
  } catch (e: any) {
    const status = e?.response?.status ?? 502;
    log.error('Player search proxy failed', {
      status,
      reason: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: 'Failed to search players' }, { status });
  }
}
