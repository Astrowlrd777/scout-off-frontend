import { NextRequest, NextResponse } from 'next/server';
import { getCodesByScout } from '@/lib/referralStore';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const codes = getCodesByScout(sessionCookie).sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  return NextResponse.json({ codes });
}
