'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  generateReferralCode,
  getReferralStats,
  listReferralCodes,
} from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';
import type { ReferralCode, ReferralStats } from '@/types';
import { Copy, Check } from 'lucide-react';
import { buildReferralCodesCsv } from '@/lib/referralCsv';
import { useToast } from '@/components/ui/Toast';

const COPIED_RESET_MS = 2000;
const PAGE_SIZE = 5;

// Unset in local dev/tests to skip the challenge entirely — mirrors the
// project's "leave blank to disable" convention for optional integrations.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

export default function ReferralPanel() {
  const { publicKey } = useWallet();
  const { show } = useToast();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyResetTimer.current !== null) clearTimeout(copyResetTimer.current);
    },
    [],
  );

  const handleCopy = useCallback((index: number, inviteUrl: string) => {
    copyToClipboard(inviteUrl);
    setCopiedIndex(index);
    if (copyResetTimer.current !== null) clearTimeout(copyResetTimer.current);
    copyResetTimer.current = setTimeout(
      () => setCopiedIndex(null),
      COPIED_RESET_MS,
    );
  }, []);

  const loadStats = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const [s] = await Promise.all([getReferralStats(publicKey)]);
      setStats(s);
    } catch {
      show({ message: 'Failed to load referral stats.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [publicKey, show]);

  const loadCodes = useCallback(async () => {
    if (!publicKey) return;
    setCodesLoading(true);
    try {
      const list = await listReferralCodes(publicKey);
      setCodes(list);
    } catch {
      // silently fail — the "generate" flow still works without history
    } finally {
      setCodesLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    loadStats();
    loadCodes();
  }, [loadStats, loadCodes]);

  const handleGenerate = useCallback(async () => {
    if (!publicKey) return;
    if (TURNSTILE_SITE_KEY && !turnstileToken) return;

    setGenerating(true);
    setGenerateError(null);
    try {
      const referral = await generateReferralCode(
        publicKey,
        turnstileToken ?? undefined,
      );
      setCodes((prev) => [referral, ...prev]);
      await loadStats();
    } catch {
      show({
        message: 'Failed to generate an invite link. Please try again.',
        variant: 'error',
      });
    } finally {
      setGenerating(false);
      // Turnstile tokens are single-use — force a fresh widget/token for
      // the next attempt regardless of outcome.
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    }
  }, [publicKey, loadStats, show]);

  const handleShowMore = useCallback(() => {
    setVisibleCount((count) => count + PAGE_SIZE);
  }, []);

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '';

  const handleExportCsv = useCallback(() => {
    if (codes.length === 0) return;

    const csvContent = buildReferralCodesCsv(codes, baseUrl);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'referral-codes.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [baseUrl, codes]);

  return (
    <div className="bg-brand-card border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Refer a Colleague</h2>
        <span className="text-sm text-gray-400">
          {loading
            ? '…'
            : `${stats?.successfulReferrals ?? 0} referral${(stats?.successfulReferrals ?? 0) !== 1 ? 's' : ''}`}
        </span>
      </div>

      <p className="text-sm text-gray-400">
        Share your personal invite link. When a new scout signs up using your
        link, you will be credited with a referral.
      </p>

      {TURNSTILE_SITE_KEY && (
        <Turnstile
          key={turnstileKey}
          siteKey={TURNSTILE_SITE_KEY}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
          onError={() => setTurnstileToken(null)}
        />
      )}

      {generateError && (
        <p role="alert" className="text-sm text-red-400">
          {generateError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={
            generating || !publicKey || (!!TURNSTILE_SITE_KEY && !turnstileToken)
          }
          className="self-start px-4 py-2 rounded-lg bg-brand-green text-black font-medium transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          {generating && (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {generating ? 'Generating…' : 'Generate Invite Link'}
        </button>

        <button
          onClick={handleExportCsv}
          disabled={codesLoading || codes.length === 0 || !publicKey}
          className="self-start px-4 py-2 rounded-lg border border-gray-700 bg-gray-900 text-sm font-medium text-gray-200 transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export as CSV
        </button>
      </div>

      {codesLoading && codes.length === 0 ? (
        <p className="text-sm text-gray-500">Loading your invite links…</p>
      ) : codes.length === 0 ? (
        <p className="text-sm text-gray-500">
          Your generated invite links will appear here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {codes.slice(0, visibleCount).map((ref, i) => {
            const inviteUrl = `${baseUrl}/scout/subscribe?ref=${ref.code}`;
            return (
              <div
                key={ref.code}
                className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2"
              >
                <code className="flex-1 text-sm text-gray-200 truncate">
                  {inviteUrl}
                </code>
                <button
                  onClick={() => handleCopy(i, inviteUrl)}
                  aria-label={`Copy invite link for code ${ref.code}`}
                  className="shrink-0 rounded px-2 py-1 text-xs font-medium transition bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  {copiedIndex === i ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            );
          })}

          {codes.length > visibleCount && (
            <button
              onClick={handleShowMore}
              className="self-start text-sm text-brand-green hover:underline"
            >
              Show more ({codes.length - visibleCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
