import fs from 'fs';
import os from 'os';
import path from 'path';

// referralStore.ts resolves its data directory from process.cwd() at module
// load time (DATA_DIR = path.join(process.cwd(), '.data')), so point cwd at
// a fresh temp directory and re-require the module before each test. This
// isolates every test to its own on-disk store and never touches (or
// depends on the prior state of) the real .data/ folder.
let tmpDir: string;
let referralStore: typeof import('@/lib/referralStore');

const VALID_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_FORMAT = new RegExp(`^SCOUT-[${VALID_CODE_ALPHABET}]{6}$`);

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'referral-store-test-'));
  jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  jest.resetModules();
  referralStore = require('@/lib/referralStore');
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('generateCode', () => {
  it('returns a code in the SCOUT-XXXXXX format, owned by the given scout, unused', () => {
    const referral = referralStore.generateCode('GSCOUT_A');

    expect(referral.code).toMatch(CODE_FORMAT);
    expect(referral.scoutWallet).toBe('GSCOUT_A');
    expect(referral.usedBy).toBeNull();
    expect(referral.usedAt).toBeNull();
    expect(typeof referral.createdAt).toBe('number');
  });

  it('persists the generated code so it is retrievable via getCodesByScout', () => {
    const referral = referralStore.generateCode('GSCOUT_A');

    const codes = referralStore.getCodesByScout('GSCOUT_A');
    expect(codes).toHaveLength(1);
    expect(codes[0]).toEqual(referral);
  });

  it('generates unique codes across many calls', () => {
    const codes = Array.from({ length: 50 }, () =>
      referralStore.generateCode('GSCOUT_A').code,
    );

    expect(new Set(codes).size).toBe(codes.length);
    codes.forEach((code) => expect(code).toMatch(CODE_FORMAT));
  });

  it('retries generation on a collision until a unique code is produced', () => {
    // First call: force every random draw to index 0 ('A'), producing
    // "SCOUT-AAAAAA" against an empty store — no collision possible yet.
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const first = referralStore.generateCode('GSCOUT_A');
    expect(first.code).toBe('SCOUT-AAAAAA');
    randomSpy.mockRestore();

    // Second call: first 6 draws replay index 0, colliding with the code
    // that already exists in the store, forcing the do/while loop in
    // generateCode to retry; the next 6 draws use index 1 ('B') so the
    // retry succeeds with a distinct code.
    const sequence = [
      0, 0, 0, 0, 0, 0, // collides -> "SCOUT-AAAAAA" (retry triggered)
      1 / 32, 1 / 32, 1 / 32, 1 / 32, 1 / 32, 1 / 32, // "SCOUT-BBBBBB"
    ];
    let call = 0;
    jest.spyOn(Math, 'random').mockImplementation(() => sequence[call++]);

    const second = referralStore.generateCode('GSCOUT_A');

    expect(call).toBeGreaterThan(6); // proves the retry branch actually ran
    expect(second.code).toBe('SCOUT-BBBBBB');
    expect(second.code).not.toBe(first.code);
  });
});

describe('readStore resilience', () => {
  it('falls back to an empty store when the on-disk file is corrupted', () => {
    referralStore.generateCode('GSCOUT_A');
    const storePath = path.join(tmpDir, '.data', 'referrals.json');
    fs.writeFileSync(storePath, '{ not valid json', 'utf-8');

    expect(referralStore.getCodesByScout('GSCOUT_A')).toEqual([]);
    expect(referralStore.getReferralCount('GSCOUT_A')).toBe(0);
  });
});

describe('getCodesByScout', () => {
  it('returns only codes belonging to the given scout wallet', () => {
    referralStore.generateCode('GSCOUT_A');
    referralStore.generateCode('GSCOUT_A');
    referralStore.generateCode('GSCOUT_B');

    const codesA = referralStore.getCodesByScout('GSCOUT_A');
    const codesB = referralStore.getCodesByScout('GSCOUT_B');

    expect(codesA).toHaveLength(2);
    expect(codesA.every((c) => c.scoutWallet === 'GSCOUT_A')).toBe(true);
    expect(codesB).toHaveLength(1);
    expect(codesB[0].scoutWallet).toBe('GSCOUT_B');
  });

  it('returns an empty array for a scout with no codes', () => {
    expect(referralStore.getCodesByScout('GNOBODY')).toEqual([]);
  });
});

describe('getReferralCount', () => {
  it('counts only redeemed codes belonging to the given scout', () => {
    const codeA1 = referralStore.generateCode('GSCOUT_A');
    referralStore.generateCode('GSCOUT_A'); // never redeemed
    const codeA3 = referralStore.generateCode('GSCOUT_A');
    const codeB1 = referralStore.generateCode('GSCOUT_B');

    referralStore.redeemCode(codeA1.code, 'GFRIEND_1');
    referralStore.redeemCode(codeA3.code, 'GFRIEND_2');
    referralStore.redeemCode(codeB1.code, 'GFRIEND_3');

    expect(referralStore.getReferralCount('GSCOUT_A')).toBe(2);
    expect(referralStore.getReferralCount('GSCOUT_B')).toBe(1);
  });

  it('returns 0 when a scout has codes but none have been redeemed', () => {
    referralStore.generateCode('GSCOUT_A');
    expect(referralStore.getReferralCount('GSCOUT_A')).toBe(0);
  });

  it('returns 0 for a scout with no codes at all', () => {
    expect(referralStore.getReferralCount('GNOBODY')).toBe(0);
  });
});

describe('redeemCode', () => {
  it('succeeds for a valid, unredeemed code and records who redeemed it', () => {
    const referral = referralStore.generateCode('GSCOUT_A');

    const ok = referralStore.redeemCode(referral.code, 'GFRIEND_1');

    expect(ok).toBe(true);
    const [stored] = referralStore.getCodesByScout('GSCOUT_A');
    expect(stored.usedBy).toBe('GFRIEND_1');
    expect(typeof stored.usedAt).toBe('number');
  });

  it('fails for a code that does not exist', () => {
    const ok = referralStore.redeemCode('SCOUT-NOPE99', 'GFRIEND_1');
    expect(ok).toBe(false);
  });

  it('fails when the same code is redeemed a second time', () => {
    const referral = referralStore.generateCode('GSCOUT_A');

    const first = referralStore.redeemCode(referral.code, 'GFRIEND_1');
    const second = referralStore.redeemCode(referral.code, 'GFRIEND_2');

    expect(first).toBe(true);
    expect(second).toBe(false);
    // The original redeemer is preserved — the second attempt must not
    // overwrite it.
    const [stored] = referralStore.getCodesByScout('GSCOUT_A');
    expect(stored.usedBy).toBe('GFRIEND_1');
  });
});
