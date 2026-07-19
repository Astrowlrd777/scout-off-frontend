import { renderHook, act, waitFor } from '@testing-library/react';
import { mutate as globalMutate } from 'swr';

// ── Module mocks ──────────────────────────────────────────────────────────────
// lib/contactDetailsCache and swr are deliberately real (not mocked) — this
// suite exercises the actual session-bounded cache policy described in
// docs/contact-details-privacy.md, not a stand-in for it.

jest.mock('@/hooks/useWallet', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/lib/contract', () => ({
  getSubscription: jest.fn(),
  payToContact: jest.fn(),
  PLATFORM_CONTACT_FEE_XLM: 1,
}));

// ── Typed handles ─────────────────────────────────────────────────────────────

import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/components/ui/Toast';
import { getSubscription, payToContact } from '@/lib/contract';
import { usePayToContact } from '@/hooks/usePayToContact';
import { CONTACT_DETAILS_TTL_MS } from '@/lib/contactDetailsCache';

const mockUseWallet = useWallet as jest.Mock;
const mockUseToast = useToast as jest.Mock;
const mockGetSubscription = getSubscription as jest.Mock;
const mockPayToContact = payToContact as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCOUT_KEY = 'GCFW7QAO3WZQ6X4CZ3OYZFXX3A3DL7XVI5DNVTXA5VJUGE5SU6ZRG5OV';
const PLAYER_ID = 'player-abc';
const FUTURE = Math.floor(Date.now() / 1000) + 86_400 * 30;
const PAST = Math.floor(Date.now() / 1000) - 1000;
const DETAILS = { email: 'p@example.com', phone: '+1', telegram: '@p' };

interface WalletOverrides {
  publicKey?: string | null;
  xlmBalance?: string | null;
  signOnly?: jest.Mock;
}

function makeWallet(overrides: WalletOverrides = {}) {
  const signOnly = overrides.signOnly ?? jest.fn().mockResolvedValue('SIGNED');
  mockUseWallet.mockReturnValue({
    publicKey: 'publicKey' in overrides ? overrides.publicKey : SCOUT_KEY,
    xlmBalance: 'xlmBalance' in overrides ? overrides.xlmBalance : '5.0000000',
    signOnly,
    refreshBalance: jest.fn().mockResolvedValue(undefined),
  });
  return { signOnly };
}

function makeShow() {
  const show = jest.fn();
  mockUseToast.mockReturnValue({ show });
  return show;
}

function activeSubscription() {
  mockGetSubscription.mockResolvedValue({
    scout: SCOUT_KEY,
    tier: 'pro',
    expiresAt: FUTURE,
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  // The cache module writes through SWR's global (unscoped) mutate, so —
  // unlike most hook tests in this repo — a per-test SWRConfig provider
  // wouldn't actually isolate anything here. Reset the real global cache
  // instead, matching how context/WalletContext.tsx's disconnect() clears it.
  globalMutate(() => true, undefined, { revalidate: false });
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Subscription gate ─────────────────────────────────────────────────────────

describe('usePayToContact — subscription gate', () => {
  test('expired subscription: shows error toast and does not call payToContact', async () => {
    const show = makeShow();
    makeWallet();
    mockGetSubscription.mockResolvedValue({
      scout: SCOUT_KEY,
      tier: 'pro',
      expiresAt: PAST,
    });

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });

    expect(mockPayToContact).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        message: expect.stringContaining('active subscription'),
      }),
    );
    expect(result.current.error).toMatch(/active subscription/i);
    expect(result.current.loading).toBe(false);
  });

  test('null subscription: shows error toast and does not call payToContact', async () => {
    const show = makeShow();
    makeWallet();
    mockGetSubscription.mockResolvedValue(null);

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });

    expect(mockPayToContact).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        message: expect.stringContaining('active subscription'),
      }),
    );
  });
});

// ── Balance gate ──────────────────────────────────────────────────────────────

describe('usePayToContact — balance gate', () => {
  test('balance below fee: shows Insufficient XLM toast and does not call payToContact', async () => {
    const show = makeShow();
    makeWallet({ xlmBalance: '0.5000000' });
    activeSubscription();

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });

    expect(mockPayToContact).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        message: expect.stringContaining('Insufficient XLM'),
      }),
    );
    expect(result.current.error).toMatch(/insufficient xlm/i);
  });
});

// ── Success path & caching ────────────────────────────────────────────────────

describe('usePayToContact — success path and cache lifetime', () => {
  test('unlock() signs via the wallet-agnostic signOnly callback and caches the result', async () => {
    makeShow();
    const { signOnly } = makeWallet();
    activeSubscription();
    mockPayToContact.mockResolvedValue(DETAILS);

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });

    expect(mockPayToContact).toHaveBeenCalledWith(
      SCOUT_KEY,
      PLAYER_ID,
      signOnly,
    );
    expect(result.current.contactDetails).toEqual(DETAILS);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test('wallet not connected: shows error and skips subscription + transaction', async () => {
    const show = makeShow();
    makeWallet({ publicKey: null });

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });

    expect(mockGetSubscription).not.toHaveBeenCalled();
    expect(mockPayToContact).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        message: expect.stringContaining('Wallet not connected'),
      }),
    );
  });

  test('a second hook instance for the same player/scout reads the same cached details without unlocking again', async () => {
    makeShow();
    makeWallet();
    activeSubscription();
    mockPayToContact.mockResolvedValue(DETAILS);

    const first = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await first.result.current.unlock();
    });
    expect(first.result.current.contactDetails).toEqual(DETAILS);

    // e.g. ContactModal rendered alongside the caller that unlocked.
    const second = renderHook(() => usePayToContact(PLAYER_ID));
    await waitFor(() =>
      expect(second.result.current.contactDetails).toEqual(DETAILS),
    );
    expect(mockPayToContact).toHaveBeenCalledTimes(1);
  });

  test('clear() purges this player\'s cached contact details immediately', async () => {
    makeShow();
    makeWallet();
    activeSubscription();
    mockPayToContact.mockResolvedValue(DETAILS);

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });
    expect(result.current.contactDetails).toEqual(DETAILS);

    act(() => {
      result.current.clear();
    });

    await waitFor(() =>
      expect(result.current.contactDetails).toBeUndefined(),
    );
  });

  test('contact details are purged automatically once the TTL elapses, without an explicit clear or logout', async () => {
    jest.useFakeTimers();
    makeShow();
    makeWallet();
    activeSubscription();
    mockPayToContact.mockResolvedValue(DETAILS);

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });
    expect(result.current.contactDetails).toEqual(DETAILS);

    await act(async () => {
      jest.advanceTimersByTime(CONTACT_DETAILS_TTL_MS);
      await Promise.resolve();
    });

    expect(result.current.contactDetails).toBeUndefined();
  });

  test('re-unlocking resets the TTL window instead of purging on the original schedule', async () => {
    jest.useFakeTimers();
    makeShow();
    makeWallet();
    activeSubscription();
    mockPayToContact.mockResolvedValue(DETAILS);

    const { result } = renderHook(() => usePayToContact(PLAYER_ID));
    await act(async () => {
      await result.current.unlock();
    });

    // Half the TTL, then unlock again — this should push the purge out
    // rather than leaving the original timer to fire on schedule.
    await act(async () => {
      jest.advanceTimersByTime(CONTACT_DETAILS_TTL_MS / 2);
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.unlock();
    });
    await act(async () => {
      jest.advanceTimersByTime(CONTACT_DETAILS_TTL_MS / 2 + 1000);
      await Promise.resolve();
    });

    expect(result.current.contactDetails).toEqual(DETAILS);
  });
});
