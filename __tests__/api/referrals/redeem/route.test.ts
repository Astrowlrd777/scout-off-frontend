/** @jest-environment node */
import { POST } from '@/app/api/referrals/redeem/route';
import { NextRequest } from 'next/server';
import { redeemCode } from '@/lib/referralStore';

jest.mock('@/lib/referralStore', () => ({
  redeemCode: jest.fn(),
}));

const mockRedeemCode = redeemCode as jest.MockedFunction<typeof redeemCode>;

function makeRequest(
  body: unknown,
  cookieHeader?: string,
): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (cookieHeader) headers['cookie'] = cookieHeader;
  return new NextRequest('http://localhost:3000/api/referrals/redeem', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/referrals/redeem', () => {
  it('returns 401 when there is no session cookie', async () => {
    const res = await POST(makeRequest({ code: 'SCOUT-ABC123' }));
    expect(res.status).toBe(401);
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });

  it('returns 400 when the request body has no code', async () => {
    const res = await POST(makeRequest({}, 'session=GSCOUT'));
    expect(res.status).toBe(400);
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });

  it('returns 400 with a specific message when redemption is rejected for self-redemption', async () => {
    mockRedeemCode.mockReturnValue({
      success: false,
      reason: 'self_redemption',
    });

    const res = await POST(
      makeRequest({ code: 'SCOUT-ABC123' }, 'session=GSCOUT'),
    );

    expect(mockRedeemCode).toHaveBeenCalledWith('SCOUT-ABC123', 'GSCOUT');
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('You cannot redeem your own referral code.');
  });

  it('returns 404 with a generic message when the code is invalid or already redeemed', async () => {
    mockRedeemCode.mockReturnValue({ success: false, reason: 'not_found' });

    const res = await POST(
      makeRequest({ code: 'SCOUT-BADCODE' }, 'session=GSCOUT'),
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Invalid or already redeemed code');
  });

  it('returns 200 with success: true for a valid, non-self redemption', async () => {
    mockRedeemCode.mockReturnValue({ success: true });

    const res = await POST(
      makeRequest({ code: 'SCOUT-ABC123' }, 'session=GDIFFERENTWALLET'),
    );

    expect(mockRedeemCode).toHaveBeenCalledWith(
      'SCOUT-ABC123',
      'GDIFFERENTWALLET',
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
