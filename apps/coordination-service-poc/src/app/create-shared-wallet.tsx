import { useState } from 'react';
import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { PersonalWallet } from './load-personal-1854-wallet';
import { Coordinator } from 'coordinator';
import PublicKey from './public-key';
import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  AccountKeyDerivationPath,
  Bip32Account,
  KeyRole,
} from '@cardano-sdk/key-management';
import { chainId } from './config';

const createSharedWallet = async (
  coordinator: Coordinator,
  coSigners: Bip32PublicKeyHex[]
) => {
  const createScript = async (
    keyDerivationPath: AccountKeyDerivationPath
  ): Promise<Serialization.NativeScript> =>
    Serialization.NativeScript.fromCore({
      __type: Cardano.ScriptType.Native,
      kind: Cardano.NativeScriptKind.RequireAllOf,
      scripts: await Promise.all(
        coSigners.map(async (xpub) => {
          const account = new Bip32Account({
            extendedAccountPublicKey: xpub,
            chainId,
            accountIndex: 0,
          });
          const publicKey = await account.derivePublicKey(keyDerivationPath);
          const keyHash = await publicKey.hash();
          return {
            __type: Cardano.ScriptType.Native,
            kind: Cardano.NativeScriptKind.RequireSignature,
            keyHash: keyHash.hex(),
          };
        })
      ),
    });
  const paymentKeyPath: AccountKeyDerivationPath = {
    role: KeyRole.External,
    index: 0,
  };
  const stakingKeyPath: AccountKeyDerivationPath = {
    role: KeyRole.Stake,
    index: 0,
  };
  const paymentScript = await createScript(paymentKeyPath);
  const stakingScript = await createScript(stakingKeyPath);
  const address = Cardano.BaseAddress.fromCredentials(
    chainId.networkId,
    {
      type: Cardano.CredentialType.ScriptHash,
      hash: paymentScript.hash(),
    },
    {
      type: Cardano.CredentialType.ScriptHash,
      hash: stakingScript.hash(),
    }
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

  return coordinator.createSharedWallet({
    coSigners,
    addresses: [
      {
        address,
        paymentKeyPath,
        paymentScript,
        stakingKeyPath,
        stakingScript,
      },
    ],
  });
};

export type CreateSharedWalletProps = {
  personalWallet: PersonalWallet;
  coordinator: Coordinator;
};

export function CreateSharedWallet({
  coordinator,
  personalWallet,
}: CreateSharedWalletProps) {
  const [coSignerKey, setCoSignerKey] = useState<
    Bip32PublicKeyHex | undefined
  >();
  return (
    <div>
      <h3>Create shared wallet</h3>
      <PublicKey publicKey={personalWallet.keyAgent.extendedAccountPublicKey} />
      <span>Co-signer</span>
      <textarea
        value={coSignerKey}
        onChange={(e) => setCoSignerKey(Bip32PublicKeyHex(e.target.value))}
      />
      <button
        disabled={!coSignerKey}
        onClick={() =>
          createSharedWallet(coordinator, [
            personalWallet.keyAgent.extendedAccountPublicKey,
            coSignerKey!,
          ])
        }
      >
        Create shared wallet
      </button>
    </div>
  );
}

export default CreateSharedWallet;
