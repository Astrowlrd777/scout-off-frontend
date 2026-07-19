'use client';
import { useState, useCallback, useEffect } from 'react';
import { generateReferralCode, getReferralStats } from '@/lib/api';
import type { ReferralCode, ReferralStats } from '@/types';
import { Copy, Check } from 'lucide-react';

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

export default function ReferralPanel() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [s] = await Promise.all([getReferralStats()]);
      setStats(s);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const referral = await generateReferralCode();
      setCodes((prev) => [referral, ...prev]);
      await loadStats();
    } catch {
      // silently fail
    } finally {
      setGenerating(false);
    }
  }, [loadStats]);

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '';

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

      <button
        onClick={handleGenerate}
        disabled={generating}
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

      {codes.length > 0 && (
        <div className="flex flex-col gap-2">
          {codes.slice(0, 5).map((ref, i) => {
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
                  onClick={() => {
                    copyToClipboard(inviteUrl);
                    setCopiedIndex(i);
                    setTimeout(() => setCopiedIndex(null), 2000);
                  }}
                  className="shrink-0 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition bg-gray-700 text-gray-300 hover:bg-gray-600"
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
        </div>
      )}
    </div>
  );
}
