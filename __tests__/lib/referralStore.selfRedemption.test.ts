import fs from 'fs';
import os from 'os';
import path from 'path';

// referralStore.ts resolves its data directory from process.cwd() at module
// load time, so point cwd at an isolated temp directory before requiring it
// fresh — this keeps these tests from touching the real .data/ folder.
let tmpDir: string;
let referralStore: typeof import('@/lib/referralStore');

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

describe('referralStore self-redemption guard', () => {
  it('rejects redemption when usedBy matches the code owner', () => {
    const referral = referralStore.generateCode('GSCOUT_OWNER');

    const result = referralStore.redeemCode(referral.code, 'GSCOUT_OWNER');

    expect(result).toEqual({ success: false, reason: 'self_redemption' });
  });

  it('does not mark a self-redeemed code as used', () => {
    const referral = referralStore.generateCode('GSCOUT_OWNER');
    referralStore.redeemCode(referral.code, 'GSCOUT_OWNER');

    const codes = referralStore.getCodesByScout('GSCOUT_OWNER');
    expect(codes[0].usedBy).toBeNull();
    expect(referralStore.getReferralCount('GSCOUT_OWNER')).toBe(0);
  });

  it('still allows a genuine, non-self redemption to succeed', () => {
    const referral = referralStore.generateCode('GSCOUT_OWNER');

    const result = referralStore.redeemCode(
      referral.code,
      'GSCOUT_REFERRED_FRIEND',
    );

    expect(result).toEqual({ success: true });
    expect(referralStore.getReferralCount('GSCOUT_OWNER')).toBe(1);
  });

  it('rejects redemption of an unknown code as not_found', () => {
    const result = referralStore.redeemCode('SCOUT-NOPE99', 'GANYONE');
    expect(result).toEqual({ success: false, reason: 'not_found' });
  });
});
