import { NextRequest, NextResponse } from 'next/server';
import { redeemCode } from '@/lib/referralStore';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * Rate limiting: max 20 redemption attempts per IP per 10 minutes.
 * Defense-in-depth against code guessing — the code space is large, but
 * this closes an otherwise-open door with no throttle at all.
 */
const REDEEM_LIMIT = 20;
const REDEEM_WINDOW_MS = 10 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(
    `referral-redeem:${ip}`,
    REDEEM_LIMIT,
    REDEEM_WINDOW_MS,
  );
  if (!rl.allowed) {
    console.warn(
      `[Referral rate limit] Too many redemption attempts from IP: ${ip}`,
    );
    return NextResponse.json(
      {
        error: 'Too many redemption attempts. Please try again later.',
        retryAfter: rl.retryAfter,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  if (!body.code) {
    return NextResponse.json(
      { error: 'Missing referral code' },
      { status: 400 },
    );
  }

  const ok = redeemCode(body.code, sessionCookie);
  if (!ok) {
    return NextResponse.json(
      { error: 'Invalid or already redeemed code' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
