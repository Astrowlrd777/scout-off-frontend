import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ReferralPanel from '@/components/scout/ReferralPanel';
import { generateReferralCode, getReferralStats } from '@/lib/api';
import type { ReferralCode, ReferralStats } from '@/types';

expect.extend(toHaveNoViolations);

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

const STATS: ReferralStats = { totalCodes: 2, successfulReferrals: 1 };

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
  mockGenerateReferralCode.mockResolvedValue(makeCode('ABC123'));
});

describe('ReferralPanel accessibility', () => {
  it('gives each per-row copy button a distinct, code-specific aria-label', async () => {
    render(<ReferralPanel />);

    await screen.findByRole('button', { name: 'Generate Invite Link' });

    // Generate two codes so there are multiple otherwise-identical rows.
    const generateButton = screen.getByRole('button', {
      name: 'Generate Invite Link',
    });
    mockGenerateReferralCode.mockResolvedValueOnce(makeCode('FIRSTCODE'));
    generateButton.click();
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Copy invite link for code FIRSTCODE',
        }),
      ).toBeInTheDocument(),
    );

    mockGenerateReferralCode.mockResolvedValueOnce(makeCode('SECONDCODE'));
    generateButton.click();
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Copy invite link for code SECONDCODE',
        }),
      ).toBeInTheDocument(),
    );

    expect(
      screen.getByRole('button', {
        name: 'Copy invite link for code FIRSTCODE',
      }),
    ).toBeInTheDocument();

    // Visible text is unchanged for sighted users.
    expect(screen.getAllByText('Copy').length).toBeGreaterThanOrEqual(2);
  });

  it('has no axe violations once codes are present', async () => {
    mockGenerateReferralCode.mockResolvedValueOnce(makeCode('AXECODE'));
    const { container } = render(<ReferralPanel />);

    const generateButton = await screen.findByRole('button', {
      name: 'Generate Invite Link',
    });
    generateButton.click();

    await screen.findByRole('button', {
      name: 'Copy invite link for code AXECODE',
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
