import { NextRequest, NextResponse } from 'next/server';
import { generateCode } from '@/lib/referralStore';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * Rate limiting: max 5 referral codes generated per scout per hour.
 * When exceeded, responds with 429 Too Many Requests and Retry-After header.
 */
const GENERATE_LIMIT = 5;
const GENERATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = checkRateLimit(
    `referral-generate:${sessionCookie}`,
    GENERATE_LIMIT,
    GENERATE_WINDOW_MS,
  );
  if (!rl.allowed) {
    console.warn(
      `[Referral rate limit] Too many code generations for scout: ${sessionCookie}`,
    );
    return NextResponse.json(
      {
        error: 'Too many referral codes generated. Please try again later.',
        retryAfter: rl.retryAfter,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const referral = generateCode(sessionCookie);
  return NextResponse.json(referral);
}
