import { Cardano, Serialization } from '@cardano-sdk/core';
import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { AccountKeyDerivationPath } from '@cardano-sdk/key-management';
import { Observable } from 'rxjs';

export type SharedWalletAddress = {
  paymentScript: Serialization.NativeScript;
  stakingScript: Serialization.NativeScript;
  paymentKeyPath: AccountKeyDerivationPath;
  stakingKeyPath: AccountKeyDerivationPath;
  address: Cardano.PaymentAddress;
};

export type SharedWallet = {
  addresses: SharedWalletAddress[];
  coSigners: Bip32PublicKeyHex[];
};

export type Coordinator = {
  sharedWallets$: Observable<SharedWallet[]>;
  createSharedWallet: (sharedWallet: SharedWallet) => Promise<void>;
};
