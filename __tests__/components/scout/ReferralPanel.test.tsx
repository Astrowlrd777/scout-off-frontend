import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

async function generateCode(code: string, expectedRowCount: number) {
  mockGenerateReferralCode.mockResolvedValueOnce(makeCode(code));
  const generateButton = await screen.findByRole('button', {
    name: 'Generate Invite Link',
  });
  fireEvent.click(generateButton);
  await waitFor(() =>
    expect(
      screen.getAllByRole('button', { name: /^(Copy|Copied!)$/ }),
    ).toHaveLength(expectedRowCount),
  );
}

describe('ReferralPanel copy-confirmation timeout', () => {
  it('clears the pending copy-confirmation timeout on unmount', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { unmount } = render(<ReferralPanel />);
      await generateCode('PENDINGCODE', 1);

      const copyButton = screen.getByRole('button', { name: 'Copy' });
      fireEvent.click(copyButton);
      await screen.findByRole('button', { name: 'Copied!' });

      expect(jest.getTimerCount()).toBe(1);

      unmount();

      // The reset timer must be cleared as part of unmounting, not merely
      // left pending — otherwise it would still fire later and attempt to
      // setState on the unmounted component.
      expect(jest.getTimerCount()).toBe(0);

      // Advancing past the original 2s window must not throw or log a
      // state-update-on-unmounted-component warning.
      act(() => {
        jest.advanceTimersByTime(2500);
      });
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('resets rapid successive copies on different rows to the correct row only', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });

    try {
      render(<ReferralPanel />);
      await generateCode('ROWONE', 1);
      await generateCode('ROWTWO', 2);

      const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
      expect(copyButtons).toHaveLength(2);

      // Click the second row's copy button, then shortly after the first
      // row's, superseding the first timer.
      fireEvent.click(copyButtons[0]);
      act(() => {
        jest.advanceTimersByTime(500);
      });
      fireEvent.click(copyButtons[1]);

      const buttonsAfterSecondClick = screen.getAllByRole('button', {
        name: /^(Copy|Copied!)$/,
      });
      expect(
        buttonsAfterSecondClick.filter((b) => b.textContent === 'Copied!'),
      ).toHaveLength(1);

      // Only the most recent timer should fire; state settles back to
      // "Copy" on both rows with no leftover "Copied!" state.
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      const buttonsAfterReset = screen.getAllByRole('button', {
        name: 'Copy',
      });
      expect(buttonsAfterReset).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
