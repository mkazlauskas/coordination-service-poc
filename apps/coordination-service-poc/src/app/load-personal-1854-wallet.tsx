import { useState } from 'react';
import { InMemoryKeyAgent } from '@cardano-sdk/key-management';
import { bip32Ed25519, chainId, logger } from './config';
import { AsyncReturnType } from 'type-fest';

export type PersonalWallet = AsyncReturnType<typeof loadPersonal1854Wallet>;

export type CreateWalletProps = {
  onCreated: (wallet: PersonalWallet) => void;
};

const loadPersonal1854Wallet = async (mnemonic: string) => {
  const keyAgent = await InMemoryKeyAgent.fromBip39MnemonicWords(
    {
      chainId,
      getPassphrase: async () => Buffer.from('password'),
      mnemonicWords: mnemonic.split(' '),
      purpose: 1854,
    },
    { bip32Ed25519, logger }
  );
  return {
    keyAgent,
  };
};

export function LoadPersonal1854Wallet({ onCreated }: CreateWalletProps) {
  const [mnemonic, setMnemonic] = useState(
    'vacant violin soft weird deliver render brief always monitor general maid smart jelly core drastic erode echo there clump dizzy card filter option defense'
  );
  return (
    <div>
      <span>Mnemonic</span>
      <textarea
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
      />
      <button onClick={() => loadPersonal1854Wallet(mnemonic).then(onCreated)}>
        Load personal wallet
      </button>
    </div>
  );
}

export default LoadPersonal1854Wallet;
