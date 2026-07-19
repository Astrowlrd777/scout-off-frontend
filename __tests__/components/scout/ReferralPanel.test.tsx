import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ReferralPanel from '@/components/scout/ReferralPanel';
import {
  generateReferralCode,
  getReferralStats,
  listReferralCodes,
} from '@/lib/api';
import type { ReferralCode, ReferralStats } from '@/types';

jest.mock('@/lib/api', () => ({
  generateReferralCode: jest.fn(),
  getReferralStats: jest.fn(),
  listReferralCodes: jest.fn(),
}));

const mockGenerateReferralCode = generateReferralCode as jest.MockedFunction<
  typeof generateReferralCode
>;
const mockGetReferralStats = getReferralStats as jest.MockedFunction<
  typeof getReferralStats
>;
const mockListReferralCodes = listReferralCodes as jest.MockedFunction<
  typeof listReferralCodes
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
  mockListReferralCodes.mockResolvedValue([]);
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

describe('ReferralPanel pagination', () => {
  it('loads a scout’s previously generated codes on mount', async () => {
    mockListReferralCodes.mockResolvedValueOnce([
      makeCode('EXISTINGCODE'),
    ]);
    render(<ReferralPanel />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Copy invite link for code EXISTINGCODE',
        }),
      ).toBeInTheDocument(),
    );
  });

  it('caps the visible list at 5 codes with a "Show more" control, revealing the rest on click', async () => {
    const codes = Array.from({ length: 8 }, (_, i) =>
      makeCode(`CODE${i + 1}`),
    );
    mockListReferralCodes.mockResolvedValueOnce(codes);
    render(<ReferralPanel />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Copy invite link for code CODE1' }),
      ).toBeInTheDocument(),
    );

    // Only the first 5 are rendered up front.
    for (let i = 1; i <= 5; i++) {
      expect(
        screen.getByRole('button', {
          name: `Copy invite link for code CODE${i}`,
        }),
      ).toBeInTheDocument();
    }
    for (let i = 6; i <= 8; i++) {
      expect(
        screen.queryByRole('button', {
          name: `Copy invite link for code CODE${i}`,
        }),
      ).not.toBeInTheDocument();
    }

    const showMore = screen.getByRole('button', {
      name: /show more \(3 remaining\)/i,
    });
    fireEvent.click(showMore);

    for (let i = 6; i <= 8; i++) {
      await waitFor(() =>
        expect(
          screen.getByRole('button', {
            name: `Copy invite link for code CODE${i}`,
          }),
        ).toBeInTheDocument(),
      );
    }

    // Every remaining code is now visible, so the control disappears.
    expect(
      screen.queryByRole('button', { name: /show more/i }),
    ).not.toBeInTheDocument();
  });

  it('does not show a "Show more" control for 5 or fewer codes', async () => {
    mockListReferralCodes.mockResolvedValueOnce([
      makeCode('ONLYCODE'),
    ]);
    render(<ReferralPanel />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Copy invite link for code ONLYCODE',
        }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('button', { name: /show more/i }),
    ).not.toBeInTheDocument();
  });
});
