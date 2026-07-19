/** @jest-environment node */
import { POST } from '@/app/api/referrals/generate/route';
import { NextRequest } from 'next/server';
import { generateCode } from '@/lib/referralStore';
import { _resetStore } from '@/lib/rateLimit';

jest.mock('@/lib/referralStore', () => ({
  generateCode: jest.fn(),
}));

const mockGenerateCode = generateCode as jest.MockedFunction<
  typeof generateCode
>;

function makeRequest(cookieHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieHeader) headers['cookie'] = cookieHeader;
  return new NextRequest('http://localhost:3000/api/referrals/generate', {
    method: 'POST',
    headers,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  _resetStore();
  mockGenerateCode.mockImplementation((scoutWallet: string) => ({
    code: 'SCOUT-ABC123',
    scoutWallet,
    createdAt: Date.now(),
    usedBy: null,
    usedAt: null,
  }));
});

describe('POST /api/referrals/generate', () => {
  it('returns 401 when there is no session cookie', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(mockGenerateCode).not.toHaveBeenCalled();
  });

  it('generates a code for an authenticated scout', async () => {
    const res = await POST(makeRequest('session=GSCOUT_A'));
    expect(res.status).toBe(200);
    expect(mockGenerateCode).toHaveBeenCalledWith('GSCOUT_A');
    const json = await res.json();
    expect(json.scoutWallet).toBe('GSCOUT_A');
  });

  it('allows up to the per-scout limit without blocking', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest('session=GSCOUT_A'));
      expect(res.status).toBe(200);
    }
    expect(mockGenerateCode).toHaveBeenCalledTimes(5);
  });

  it('returns 429 with Retry-After once the per-scout limit is exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest('session=GSCOUT_A'));
    }

    const res = await POST(makeRequest('session=GSCOUT_A'));

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const json = await res.json();
    expect(json.error).toMatch(/too many/i);
    expect(typeof json.retryAfter).toBe('number');
    expect(json.retryAfter).toBeGreaterThan(0);
    // The 6th call must not have generated another code.
    expect(mockGenerateCode).toHaveBeenCalledTimes(5);
  });

  it('rate-limits each scout independently', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest('session=GSCOUT_A'));
    }
    // GSCOUT_A is now limited...
    expect((await POST(makeRequest('session=GSCOUT_A'))).status).toBe(429);
    // ...but a different scout is unaffected.
    expect((await POST(makeRequest('session=GSCOUT_B'))).status).toBe(200);
  });
});
