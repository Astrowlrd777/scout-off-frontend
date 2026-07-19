/** @jest-environment node */
import { POST } from '@/app/api/referrals/redeem/route';
import { NextRequest } from 'next/server';
import { redeemCode } from '@/lib/referralStore';
import { _resetStore } from '@/lib/rateLimit';

jest.mock('@/lib/referralStore', () => ({
  redeemCode: jest.fn(),
}));

const mockRedeemCode = redeemCode as jest.MockedFunction<typeof redeemCode>;

function makeRequest(
  body: unknown,
  opts: { cookieHeader?: string; ip?: string } = {},
): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (opts.cookieHeader) headers['cookie'] = opts.cookieHeader;
  if (opts.ip) headers['x-forwarded-for'] = opts.ip;
  return new NextRequest('http://localhost:3000/api/referrals/redeem', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetStore();
  mockRedeemCode.mockReturnValue(true);
});

describe('POST /api/referrals/redeem', () => {
  it('returns 401 when there is no session cookie', async () => {
    const res = await POST(makeRequest({ code: 'SCOUT-ABC123' }));
    expect(res.status).toBe(401);
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });

  it('redeems a valid code for an authenticated scout', async () => {
    const res = await POST(
      makeRequest(
        { code: 'SCOUT-ABC123' },
        { cookieHeader: 'session=GSCOUT_A', ip: '1.1.1.1' },
      ),
    );
    expect(res.status).toBe(200);
    expect(mockRedeemCode).toHaveBeenCalledWith('SCOUT-ABC123', 'GSCOUT_A');
  });

  it('allows up to the per-IP limit without blocking', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await POST(
        makeRequest(
          { code: `SCOUT-CODE${i}` },
          { cookieHeader: 'session=GSCOUT_A', ip: '2.2.2.2' },
        ),
      );
      expect(res.status).toBe(200);
    }
    expect(mockRedeemCode).toHaveBeenCalledTimes(20);
  });

  it('returns 429 with Retry-After once the per-IP limit is exceeded', async () => {
    for (let i = 0; i < 20; i++) {
      await POST(
        makeRequest(
          { code: `SCOUT-CODE${i}` },
          { cookieHeader: 'session=GSCOUT_A', ip: '3.3.3.3' },
        ),
      );
    }

    const res = await POST(
      makeRequest(
        { code: 'SCOUT-ONEMORE' },
        { cookieHeader: 'session=GSCOUT_A', ip: '3.3.3.3' },
      ),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const json = await res.json();
    expect(json.error).toMatch(/too many/i);
    expect(typeof json.retryAfter).toBe('number');
    // The over-limit call must not have reached redeemCode.
    expect(mockRedeemCode).toHaveBeenCalledTimes(20);
  });

  it('rate-limits each IP independently', async () => {
    for (let i = 0; i < 20; i++) {
      await POST(
        makeRequest(
          { code: `SCOUT-CODE${i}` },
          { cookieHeader: 'session=GSCOUT_A', ip: '4.4.4.4' },
        ),
      );
    }
    expect(
      (
        await POST(
          makeRequest(
            { code: 'SCOUT-OVER' },
            { cookieHeader: 'session=GSCOUT_A', ip: '4.4.4.4' },
          ),
        )
      ).status,
    ).toBe(429);
    expect(
      (
        await POST(
          makeRequest(
            { code: 'SCOUT-DIFFERENT-IP' },
            { cookieHeader: 'session=GSCOUT_A', ip: '5.5.5.5' },
          ),
        )
      ).status,
    ).toBe(200);
  });

  it('still enforces existing validation (missing code) when under the rate limit', async () => {
    const res = await POST(
      makeRequest({}, { cookieHeader: 'session=GSCOUT_A', ip: '6.6.6.6' }),
    );
    expect(res.status).toBe(400);
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });
});
