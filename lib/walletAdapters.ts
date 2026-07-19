import {
  getPublicKey as freighterGetPublicKey,
  isConnected as freighterIsConnected,
  signTransaction as freighterSign,
} from '@stellar/freighter-api';
import { TransactionBuilder, StrKey } from '@stellar/stellar-sdk';
import Str from '@ledgerhq/hw-app-str';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';

export type WalletProvider = 'freighter' | 'albedo' | 'lobstr' | 'ledger';

const STANDARD_LEDGER_PATH = "44'/148'/0'";

let _ledgerPublicKey: string | null = null;

export const walletAdapters: Record<
  WalletProvider,
  {
    getPublicKey(): Promise<string>;
    signTransaction(xdr: string, networkPassphrase: string): Promise<string>;
  }
> = {
  freighter: {
    async getPublicKey() {
      if (!(await freighterIsConnected()))
        throw new Error('Freighter not installed');
      return freighterGetPublicKey();
    },
    async signTransaction(xdr, networkPassphrase) {
      return freighterSign(xdr, { networkPassphrase });
    },
  },
  albedo: {
    async getPublicKey() {
      throw new Error('Albedo adapter not configured');
    },
    async signTransaction(_xdr, _networkPassphrase) {
      throw new Error('Albedo adapter not configured');
    },
  },
  lobstr: {
    async getPublicKey() {
      throw new Error('LOBSTR adapter not configured');
    },
    async signTransaction(_xdr, _networkPassphrase) {
      throw new Error('LOBSTR adapter not configured');
    },
  },
  ledger: {
    async getPublicKey() {
      let transport;
      try {
        transport = await TransportWebHID.create();
        const str = new Str(transport);
        const { rawPublicKey } = await str.getPublicKey(
          STANDARD_LEDGER_PATH,
          false,
        );
        const pk = StrKey.encodeEd25519PublicKey(rawPublicKey);
        _ledgerPublicKey = pk;
        return pk;
      } catch (err: unknown) {
        throw mapLedgerError(err, 'Failed to get public key from Ledger');
      } finally {
        if (transport) await transport.close().catch(() => {});
      }
    },
    async signTransaction(xdr, networkPassphrase) {
      let transport;
      try {
        transport = await TransportWebHID.create();
        const str = new Str(transport);
        const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
        const signatureBase = tx.signatureBase();
        const { signature } = await str.signTransaction(
          STANDARD_LEDGER_PATH,
          signatureBase,
        );
        const pk =
          _ledgerPublicKey ??
          StrKey.encodeEd25519PublicKey(
            (await str.getPublicKey(STANDARD_LEDGER_PATH, false)).rawPublicKey,
          );
        tx.addSignature(pk, signature);
        return tx.toXDR();
      } catch (err: unknown) {
        throw mapLedgerError(err, 'Failed to sign transaction with Ledger');
      } finally {
        if (transport) await transport.close().catch(() => {});
      }
    },
  },
};

function mapLedgerError(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    if (
      msg.includes('no device') ||
      msg.includes('device not found') ||
      msg.includes('no_webhid') ||
      msg.includes('no webhid') ||
      msg.includes('failed to open') ||
      msg.includes('access denied')
    ) {
      return new Error(
        'Ledger device not detected. Please connect your Ledger and open the Stellar app, then try again.',
      );
    }

    if (
      msg.includes('user refused') ||
      msg.includes('denied') ||
      msg.includes('app does not seem to be open')
    ) {
      return new Error(
        'Request cancelled. Make sure the Stellar app is open on your Ledger device and try again.',
      );
    }

    if (
      msg.includes('not supported') ||
      msg.includes('webhid is not supported')
    ) {
      return new Error(
        'WebHID is not supported in your browser. Please use Chrome, Edge, or Opera.',
      );
    }

    if (msg.includes('stellar app') || msg.includes('0x6985')) {
      return new Error(
        'Stellar app is not open on your Ledger device. Please open it and try again.',
      );
    }
  }
  return err instanceof Error
    ? err
    : new Error(fallbackMessage);
}
