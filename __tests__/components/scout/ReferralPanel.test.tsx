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

describe('ReferralPanel empty state', () => {
  it('shows a brief message when the scout has never generated a code', async () => {
    render(<ReferralPanel />);

    await screen.findByRole('button', { name: 'Generate Invite Link' });

    expect(
      screen.getByText('Your generated invite links will appear here.'),
    ).toBeInTheDocument();
  });

  it('hides the empty-state message once at least one code exists', async () => {
    mockGenerateReferralCode.mockResolvedValueOnce(makeCode('FIRSTCODE'));
    render(<ReferralPanel />);

    const generateButton = await screen.findByRole('button', {
      name: 'Generate Invite Link',
    });
    fireEvent.click(generateButton);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument(),
    );

    expect(
      screen.queryByText('Your generated invite links will appear here.'),
    ).not.toBeInTheDocument();
  });
});
