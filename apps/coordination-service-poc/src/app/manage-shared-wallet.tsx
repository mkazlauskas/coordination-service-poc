import { PersonalWallet } from './load-personal-1854-wallet';
import { Coordinator, SharedWallet } from 'coordinator';

export type SharedWalletProps = {
  sharedWallet: SharedWallet;
  personalWallet: PersonalWallet;
  coordinator: Coordinator;
};

export function ManageSharedWallet({
  personalWallet,
  sharedWallet,
}: SharedWalletProps) {
  return (
    <div>
      <h3>
        Shared wallet with{' '}
        {JSON.stringify(
          sharedWallet.coSigners.filter(
            (key) => key !== personalWallet.keyAgent.extendedAccountPublicKey
          )
        )}
      </h3>
      {sharedWallet.addresses.map((addr) => (
        <div key={addr.address}>{addr.address}</div>
      ))}
    </div>
  );
}

export default ManageSharedWallet;
