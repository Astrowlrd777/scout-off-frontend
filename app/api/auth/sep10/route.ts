import { WebAuth, Networks, Keypair } from '@stellar/stellar-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger, withRequestId } from '@/lib/logger';

function getAllowedOrigin(req: NextRequest): string | null {
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (configured) return configured;

  const host = req.headers.get('host');
  if (!host) return null;
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const log = createRequestLogger(req);
  const origin = req.headers.get('origin');
  const allowed = getAllowedOrigin(req);

  if (!origin || !allowed || origin !== allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { signedXdr?: string; publicKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { signedXdr, publicKey } = body ?? {};
  if (!signedXdr || !publicKey) {
    return NextResponse.json(
      { error: 'Missing signedXdr or publicKey' },
      { status: 400 },
    );
  }

  const serverKey = process.env.SEP10_SERVER_KEY ?? '';
  const homeDomain = process.env.SEP10_HOME_DOMAIN ?? '';
  const network =
    process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
      ? Networks.PUBLIC
      : Networks.TESTNET;

  try {
    // verifyChallengeTxSigners' second argument is the server's *public* key
    // (compared directly against the challenge transaction's source
    // account) — passing the raw secret seed here always fails with
    // "the transaction source account is not equal to the server's account".
    const serverAccountId = Keypair.fromSecret(serverKey).publicKey();
    WebAuth.verifyChallengeTxSigners(
      signedXdr,
      serverAccountId,
      network,
      [publicKey],
      homeDomain,
      homeDomain,
    );

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', publicKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return withRequestId(response, log.requestId);
  } catch (error) {
    log.error('SEP-10 verification failed', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return withRequestId(
      NextResponse.json(
        { error: error instanceof Error ? error.message : 'Verification failed' },
        { status: 401 },
      ),
      log.requestId,
    );
  }
}

export async function GET(req: NextRequest) {
  const log = createRequestLogger(req);
  const account = req.nextUrl.searchParams.get('account');
  if (!account) {
    return NextResponse.json(
      { error: 'Missing account parameter' },
      { status: 400 },
    );
  }

  const serverKey = process.env.SEP10_SERVER_KEY;
  if (!serverKey) {
    return NextResponse.json(
      { error: 'Server not configured' },
      { status: 500 },
    );
  }

  const homeDomain = process.env.SEP10_HOME_DOMAIN ?? '';
  const network =
    process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
      ? Networks.PUBLIC
      : Networks.TESTNET;

  try {
    const { Keypair } = await import('@stellar/stellar-sdk');
    const serverKeypair = Keypair.fromSecret(serverKey);
    const { buildChallengeTx } = (await import('@stellar/stellar-sdk')).WebAuth;
    const challengeXdr = buildChallengeTx(
      serverKeypair,
      account,
      homeDomain,
      300,
      network,
      homeDomain,
    );
    return NextResponse.json({ transaction: challengeXdr });
  } catch (error) {
    log.error('SEP-10 challenge generation failed', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return withRequestId(
      NextResponse.json(
        { error: 'Failed to generate challenge' },
        { status: 500 },
      ),
      log.requestId,
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('session');
  return response;
}
