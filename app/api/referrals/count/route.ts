import { NextRequest, NextResponse } from 'next/server';
import { getReferralCount, getCodesByScout } from '@/lib/referralStore';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const codes = getCodesByScout(sessionCookie);
  const count = getReferralCount(sessionCookie);

  return NextResponse.json({
    totalCodes: codes.length,
    successfulReferrals: count,
  });
}
