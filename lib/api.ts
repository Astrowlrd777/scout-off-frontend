import axios from 'axios';
import type { Player } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});

// Players
export const fetchPlayerProfile = (playerId: string) =>
  api.get(`/players/${playerId}`).then((r) => r.data);

export const searchPlayersByName = (name: string): Promise<Player[]> =>
  api.get('/players/search', { params: { name } }).then((r) => r.data);

export const fetchPlayerComments = (playerId: string) =>
  api.get(`/players/${playerId}/comments`).then((r) => r.data);

export const archivePlayerProfile = (playerId: string): Promise<Player> =>
  api.post(`/players/${playerId}/archive`).then((r) => r.data);

export const unarchivePlayerProfile = (playerId: string): Promise<Player> =>
  api.post(`/players/${playerId}/unarchive`).then((r) => r.data);

export const linkBackupWallet = (playerId: string, backupWallet: string, signature: string): Promise<Player> =>
  api.post(`/players/${playerId}/backup-wallet/link`, { backupWallet, signature }).then((r) => r.data);

export const removeBackupWallet = (playerId: string): Promise<Player> =>
  api.post(`/players/${playerId}/backup-wallet/remove`).then((r) => r.data);

export const claimAccountWithBackupWallet = (primaryWallet: string, backupWallet: string): Promise<{ playerId: string; wallet: string }> =>
  api.post('/players/recovery/claim', { primaryWallet, backupWallet }).then((r) => r.data);

// Scouts
export const fetchScoutProfile = (scoutId: string) =>
  api.get(`/scouts/${scoutId}`).then((r) => r.data);

export const fetchScoutContacts = (scoutId: string) =>
  api.get(`/scouts/${scoutId}/contacts`).then((r) => r.data);

export interface ScoutStats {
  contactedCount: number;
  trialOffersCount: number;
}

export const fetchScoutStats = (scoutId: string): Promise<ScoutStats> =>
  api.get(`/scouts/${scoutId}/stats`).then((r) => r.data);

// Chat
export const fetchChatHistory = (roomId: string) =>
  api.get(`/chat/${roomId}`).then((r) => r.data);

export const postChatMessage = (
  roomId: string,
  message: string,
  sender: string,
) => api.post(`/chat/${roomId}`, { message, sender }).then((r) => r.data);

// Admin activity feed
export type ActivityEventType =
  | 'player_registered'
  | 'milestone_approved'
  | 'milestone_revoked'
  | 'scout_subscribed'
  | 'player_contacted'
  | 'fees_withdrawn';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: number;
  actor: string;
  subjectId?: string;
}

export const fetchActivityEvents = (
  page = 1,
  pageSize = 20,
): Promise<{ events: ActivityEvent[]; total: number }> =>
  api
    .get('/admin/activity', { params: { page, pageSize } })
    .then((r) => r.data);

// Validators
/**
 * Fetches the number of milestones approved by a specific validator from the
 * indexer. Returns `null` when the indexer is unavailable or returns an
 * unexpected response so callers can fall back gracefully.
 */
export const fetchValidatorMilestoneCount = async (
  validatorAddress: string,
): Promise<number | null> => {
  try {
    const data = await api
      .get(`/validators/${encodeURIComponent(validatorAddress)}/stats`)
      .then((r) => r.data);
    const count = data?.milestoneCount ?? data?.milestone_count;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
};

// Referrals
//
// Backed by the Node.js off-chain API (server/) — a real SQLite-backed
// service, not a local Next.js route reading/writing a JSON file. Follows
// the same shared-axios-client pattern as the chat helpers above.
import type {
  ReferralCode,
  ReferralStats,
  ReferralOverview,
  FraudFlag,
} from '@/types';

export const generateReferralCode = (
  scoutWallet: string,
): Promise<ReferralCode> =>
  api.post('/referrals/generate', { scoutWallet }).then((r) => r.data);

export const getReferralStats = (
  scoutWallet: string,
): Promise<ReferralStats> =>
  api
    .get(`/referrals/count/${encodeURIComponent(scoutWallet)}`)
    .then((r) => r.data);

export const listReferralCodes = (
  scoutWallet: string,
): Promise<ReferralCode[]> =>
  api
    .get(`/referrals/scout/${encodeURIComponent(scoutWallet)}`)
    .then((r) => r.data);

export const redeemReferralCode = (
  code: string,
  usedBy: string,
): Promise<boolean> =>
  api
    .post('/referrals/redeem', { code, usedBy })
    .then(() => true)
    .catch(() => false);

export const fetchAllReferralCodes = (): Promise<ReferralCode[]> =>
  api.get('/referrals/all').then((r) => r.data);

export const getReferralOverview = async (): Promise<ReferralOverview> => {
  const res = await fetch('/api/admin/referrals');
  if (!res.ok) throw new Error('Failed to fetch referral overview');
  return res.json();
};

// Fraud / abuse detection (admin only)
export const fetchFraudFlags = async (): Promise<{
  flags: FraudFlag[];
  warnings: string[];
}> => {
  const res = await fetch('/api/admin/fraud-flags');
  if (!res.ok) throw new Error('Failed to fetch fraud flags');
  return res.json();
};

export default api;
