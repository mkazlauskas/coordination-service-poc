import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

export type PublicKeyProps = {
  publicKey: Bip32PublicKeyHex;
};

export function PublicKey({ publicKey }: PublicKeyProps) {
  return (
    <div>
      <h4>Your public key to share</h4>
      <span>{publicKey}</span>
    </div>
  );
}

export default PublicKey;
