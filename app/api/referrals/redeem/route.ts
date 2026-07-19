import { NextRequest, NextResponse } from 'next/server';
import { redeemCode } from '@/lib/referralStore';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const result = redeemCode(body.code, sessionCookie);
  if (!result.success) {
    if (result.reason === 'self_redemption') {
      return NextResponse.json(
        { error: 'You cannot redeem your own referral code.' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Invalid or already redeemed code' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
