'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  codes: ReferralCode[];
}

export interface ReferralCode {
  code: string;
  createdAt: number; // Unix timestamp
  usageCount: number;
}

export const fetchReferralStats = (scoutId: string): Promise<ReferralStats> =>
  api.get(`/scouts/${scoutId}/referrals`).then((r) => r.data);

export const generateReferralCode = (scoutId: string): Promise<ReferralCode> =>
  api.post(`/scouts/${scoutId}/referrals`).then((r) => r.data);

interface ReferralPanelProps {
  scoutId: string;
}

export default function ReferralPanel({ scoutId }: ReferralPanelProps) {
  const toast = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchReferralStats(scoutId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.show({
            message: 'Failed to load referral stats. Please try again.',
            variant: 'error',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const newCode = await generateReferralCode(scoutId);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              codes: [newCode, ...prev.codes],
              totalReferrals: prev.totalReferrals,
              activeReferrals: prev.activeReferrals,
            }
          : { totalReferrals: 0, activeReferrals: 0, codes: [newCode] },
      );
    } catch {
      toast.show({
        message: 'Failed to generate invite link. Please try again.',
        variant: 'error',
      });
    } finally {
      setGenerating(false);
    }
  }, [scoutId, toast]);

  const handleCopy = useCallback(
    async (code: string) => {
      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?ref=${code}`;
      try {
        await navigator.clipboard.writeText(link);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch {
        toast.show({
          message: 'Failed to copy link to clipboard.',
          variant: 'error',
        });
      }
    },
    [toast],
  );

  return (
    <section
      className="bg-brand-card border border-gray-800 rounded-xl p-5 flex flex-col gap-5"
      aria-label="Referral Panel"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Referrals</h2>
        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-green text-black hover:opacity-90 transition disabled:opacity-50"
          aria-label="Generate Invite Link"
        >
          {generating ? 'Generating…' : 'Generate Invite Link'}
        </button>
      </div>

      {/* Summary stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3" aria-label="Loading stats">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-lg p-3 text-center"
              aria-hidden="true"
            >
              <div className="h-6 w-10 mx-auto bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-16 mx-auto bg-gray-700 rounded mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <span className="text-xl font-bold text-white">
                {stats.totalReferrals}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">Total Referrals</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <span className="text-xl font-bold text-white">
                {stats.activeReferrals}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">Active Referrals</p>
            </div>
          </div>
        )
      )}

      {/* Referral codes list */}
      {!loading && stats && stats.codes.length === 0 && (
        <p className="text-sm text-gray-400">
          No invite links yet. Generate one above.
        </p>
      )}

      {!loading && stats && stats.codes.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Referral codes">
          {stats.codes.map((rc) => (
            <li
              key={rc.code}
              className="flex items-center justify-between gap-2 bg-gray-900 rounded-lg px-4 py-2"
            >
              <span className="font-mono text-sm text-gray-300 truncate">
                {rc.code}
              </span>
              <span className="text-xs text-gray-500 shrink-0">
                {rc.usageCount} use{rc.usageCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => handleCopy(rc.code)}
                aria-label={`Copy invite link for ${rc.code}`}
                className="text-xs text-brand-green hover:opacity-75 transition shrink-0"
              >
                {copiedCode === rc.code ? 'Copied!' : 'Copy'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
