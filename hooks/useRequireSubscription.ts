'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from './useWallet';
import { useSubscription } from './useSubscription';
import { useToast } from '@/components/ui/Toast';

/**
 * Access-guard hook for subscriber-only scout pages.
 *
 * - When there is no connected wallet (`publicKey` is falsy) the hook is a
 *   no-op — `useRequireWallet` handles that redirect elsewhere.
 * - While the subscription data is still loading the hook waits without
 *   redirecting, so the UI doesn't flash a redirect mid-load.
 * - Once loading has settled, if the subscription is absent or expired the
 *   user sees a warning toast and is redirected to `/subscribe`.
 */
export function useRequireSubscription() {
  const { publicKey } = useWallet();
  const { subscription, isExpired, loading } = useSubscription();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    // No wallet — delegate to useRequireWallet; nothing to do here.
    if (!publicKey) return;

    // Still fetching subscription data — wait before deciding.
    if (loading) return;

    // Redirect when subscription is missing or has expired.
    if (!subscription || isExpired) {
      toast.show({
        message: 'An active subscription is required to access this page.',
        variant: 'warning',
      });
      router.replace('/subscribe');
    }
  }, [publicKey, loading, subscription, isExpired, router, toast]);
}
