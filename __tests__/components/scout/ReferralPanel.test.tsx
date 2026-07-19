import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReferralPanel from '@/components/scout/ReferralPanel';
import { generateReferralCode, getReferralStats } from '@/lib/api';
import type { ReferralCode, ReferralStats } from '@/types';

jest.mock('@/lib/api', () => ({
  generateReferralCode: jest.fn(),
  getReferralStats: jest.fn(),
}));

const mockGenerateReferralCode = generateReferralCode as jest.MockedFunction<
  typeof generateReferralCode
>;
const mockGetReferralStats = getReferralStats as jest.MockedFunction<
  typeof getReferralStats
>;

const STATS: ReferralStats = { totalCodes: 0, successfulReferrals: 0 };

function makeCode(code: string): ReferralCode {
  return {
    code,
    scoutWallet: 'GSCOUT',
    createdAt: Date.now() / 1000,
    usedBy: null,
    usedAt: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetReferralStats.mockResolvedValue(STATS);
});

describe('ReferralPanel invite URL format', () => {
  it('renders the invite URL as <baseUrl>/scout/subscribe?ref=<code>', async () => {
    mockGenerateReferralCode.mockResolvedValueOnce(makeCode('MYCODE123'));
    render(<ReferralPanel />);

    const generateButton = await screen.findByRole('button', {
      name: 'Generate Invite Link',
    });
    fireEvent.click(generateButton);

    // Derive the expected base URL from window.location, the same way the
    // component does, so this test stays valid across jsdom test hosts.
    const expectedUrl = `${window.location.protocol}//${window.location.host}/scout/subscribe?ref=MYCODE123`;

    await waitFor(() =>
      expect(screen.getByText(expectedUrl)).toBeInTheDocument(),
    );

    // Exact-match the full string, so a change to the path segment or the
    // `ref` query param name (not just the code) fails this test.
    expect(screen.getByText(expectedUrl).textContent).toBe(expectedUrl);
    expect(expectedUrl).toBe('http://localhost/scout/subscribe?ref=MYCODE123');
  });
});
