import { useEffect, useState } from 'react';
import CreateSharedWallet from './create-shared-wallet';
import { PersonalWallet } from './load-personal-1854-wallet';
import { Coordinator, SharedWallet } from 'coordinator';
import ChooseCoordinator from './choose-coordinator';
import ManageSharedWallet from './manage-shared-wallet';

export type WalletProps = {
  personalWallet: PersonalWallet;
};

export function SharedWallets({ personalWallet }: WalletProps) {
  const [coordinator, setCoordinator] = useState<Coordinator | undefined>();
  const [sharedWallets, setSharedWallets] = useState<SharedWallet[]>([]);
  useEffect(() => {
    const subscription =
      coordinator?.sharedWallets$.subscribe(setSharedWallets);
    return subscription?.unsubscribe;
  }, [coordinator]);
  return (
    <div>
      <ChooseCoordinator
        personalWallet={personalWallet}
        onCoordinatorChosen={setCoordinator}
      />
      {coordinator && (
        <div>
          <CreateSharedWallet
            personalWallet={personalWallet}
            coordinator={coordinator}
          />
          {sharedWallets.map((sharedWallet) => (
            <ManageSharedWallet
              key={sharedWallet.addresses.join()}
              personalWallet={personalWallet}
              sharedWallet={sharedWallet}
              coordinator={coordinator}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SharedWallets;
