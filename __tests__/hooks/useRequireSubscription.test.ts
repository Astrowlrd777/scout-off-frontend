import { renderHook } from '@testing-library/react';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/hooks/useWallet', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}));

// ── Typed handles ─────────────────────────────────────────────────────────────

import { useWallet } from '@/hooks/useWallet';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useRequireSubscription } from '@/hooks/useRequireSubscription';

const mockUseWallet = useWallet as jest.Mock;
const mockUseSubscription = useSubscription as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseToast = useToast as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

const PUBLIC_KEY = 'GCFW7QAO3WZQ6X4CZ3OYZFXX3A3DL7XVI5DNVTXA5VJUGE5SU6ZRG5OV';
const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 86_400 * 30; // 30 days ahead
const PAST_EXPIRY = Math.floor(Date.now() / 1000) - 1000;           // 1000 s ago

function makeRouter() {
  const replace = jest.fn();
  mockUseRouter.mockReturnValue({ replace });
  return { replace };
}

function makeToast() {
  const show = jest.fn();
  mockUseToast.mockReturnValue({ show });
  return { show };
}

function setup({
  publicKey = PUBLIC_KEY,
  loading = false,
  subscription = null as { scout: string; tier: string; expiresAt: number } | null,
  isExpired = false,
} = {}) {
  mockUseWallet.mockReturnValue({ publicKey });
  mockUseSubscription.mockReturnValue({ subscription, isExpired, loading });
  const router = makeRouter();
  const toast = makeToast();
  const { result } = renderHook(() => useRequireSubscription());
  return { result, router, toast };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRequireSubscription', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // 1 ─ No redirect while loading ──────────────────────────────────────────────
  it('does not redirect while loading is true, even when subscription is null', () => {
    const { router, toast } = setup({ loading: true, subscription: null });
    expect(router.replace).not.toHaveBeenCalled();
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('does not redirect while loading is true, even when isExpired is true', () => {
    const expiredSub = { scout: PUBLIC_KEY, tier: 'basic', expiresAt: PAST_EXPIRY };
    const { router, toast } = setup({ loading: true, subscription: expiredSub, isExpired: true });
    expect(router.replace).not.toHaveBeenCalled();
    expect(toast.show).not.toHaveBeenCalled();
  });

  // 2 ─ No redirect when no wallet ─────────────────────────────────────────────
  it('does not redirect when publicKey is falsy (no wallet connected)', () => {
    const { router, toast } = setup({ publicKey: '', loading: false, subscription: null });
    expect(router.replace).not.toHaveBeenCalled();
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('does not redirect when publicKey is null', () => {
    const { router, toast } = setup({ publicKey: null as any, loading: false, subscription: null });
    expect(router.replace).not.toHaveBeenCalled();
    expect(toast.show).not.toHaveBeenCalled();
  });

  // 3 ─ Redirect when subscription is missing ──────────────────────────────────
  it('redirects to /subscribe when subscription is null after loading', () => {
    const { router } = setup({ loading: false, subscription: null, isExpired: false });
    expect(router.replace).toHaveBeenCalledWith('/subscribe');
  });

  it('shows a warning toast when subscription is null after loading', () => {
    const { toast } = setup({ loading: false, subscription: null, isExpired: false });
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning' }),
    );
  });

  // 4 ─ Redirect when subscription is expired ──────────────────────────────────
  it('redirects to /subscribe when isExpired is true after loading', () => {
    const expiredSub = { scout: PUBLIC_KEY, tier: 'basic', expiresAt: PAST_EXPIRY };
    const { router } = setup({ loading: false, subscription: expiredSub, isExpired: true });
    expect(router.replace).toHaveBeenCalledWith('/subscribe');
  });

  it('shows a warning toast when isExpired is true after loading', () => {
    const expiredSub = { scout: PUBLIC_KEY, tier: 'basic', expiresAt: PAST_EXPIRY };
    const { toast } = setup({ loading: false, subscription: expiredSub, isExpired: true });
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning' }),
    );
  });

  // 5 ─ No redirect when subscription is active ────────────────────────────────
  it('does not redirect when subscription is active and not expired', () => {
    const activeSub = { scout: PUBLIC_KEY, tier: 'pro', expiresAt: FUTURE_EXPIRY };
    const { router, toast } = setup({
      loading: false,
      subscription: activeSub,
      isExpired: false,
    });
    expect(router.replace).not.toHaveBeenCalled();
    expect(toast.show).not.toHaveBeenCalled();
  });

  // 6 ─ Toast message content ───────────────────────────────────────────────────
  it('toast message mentions subscription requirement', () => {
    const { toast } = setup({ loading: false, subscription: null });
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/subscription/i),
        variant: 'warning',
      }),
    );
  });
});
