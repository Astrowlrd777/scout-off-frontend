import fs from 'fs';
import path from 'path';
import type { ReferralCode, ReferralOverview } from '@/types';

const TOP_REFERRERS_LIMIT = 10;

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'referrals.json');

interface StoreData {
  codes: ReferralCode[];
}

function readStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) return { codes: [] };
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { codes: [] };
  }
}

function writeStore(data: StoreData): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function generateCode(scoutWallet: string): ReferralCode {
  const store = readStore();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = 'SCOUT-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (store.codes.some((c) => c.code === code));

  const referral: ReferralCode = {
    code,
    scoutWallet,
    createdAt: Date.now(),
    usedBy: null,
    usedAt: null,
  };
  store.codes.push(referral);
  writeStore(store);
  return referral;
}

export function getCodesByScout(scoutWallet: string): ReferralCode[] {
  const store = readStore();
  return store.codes.filter((c) => c.scoutWallet === scoutWallet);
}

/**
 * Returns every referral code across every scout wallet.
 *
 * Unlike {@link getCodesByScout}, this has visibility across the whole
 * store rather than one wallet — needed for cross-wallet analysis (see
 * lib/fraudDetection.ts) that can't be done from a single scout's view.
 */
export function getAllCodes(): ReferralCode[] {
  return readStore().codes;
}

export function getReferralCount(scoutWallet: string): number {
  const store = readStore();
  return store.codes.filter(
    (c) => c.scoutWallet === scoutWallet && c.usedBy !== null,
  ).length;
}

/** Platform-wide referral totals and the top referrers by successful referrals. */
export function getReferralOverview(): ReferralOverview {
  const store = readStore();

  const byScout = new Map<
    string,
    { totalCodes: number; successfulReferrals: number }
  >();
  for (const c of store.codes) {
    const entry = byScout.get(c.scoutWallet) ?? {
      totalCodes: 0,
      successfulReferrals: 0,
    };
    entry.totalCodes += 1;
    if (c.usedBy !== null) entry.successfulReferrals += 1;
    byScout.set(c.scoutWallet, entry);
  }

  const topReferrers = Array.from(byScout.entries())
    .map(([scoutWallet, stats]) => ({ scoutWallet, ...stats }))
    .sort(
      (a, b) =>
        b.successfulReferrals - a.successfulReferrals ||
        b.totalCodes - a.totalCodes,
    )
    .slice(0, TOP_REFERRERS_LIMIT);

  return {
    totalCodes: store.codes.length,
    totalSuccessfulReferrals: store.codes.filter((c) => c.usedBy !== null)
      .length,
    topReferrers,
  };
}

export function redeemCode(code: string, usedBy: string): boolean {
  const store = readStore();
  const idx = store.codes.findIndex(
    (c) => c.code === code && c.usedBy === null,
  );
  if (idx === -1) return { success: false, reason: 'not_found' };

  if (store.codes[idx].scoutWallet === usedBy) {
    return { success: false, reason: 'self_redemption' };
  }

  store.codes[idx].usedBy = usedBy;
  store.codes[idx].usedAt = Date.now();
  writeStore(store);
  return { success: true };
}
