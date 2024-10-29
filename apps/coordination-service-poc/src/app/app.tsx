import { useState } from 'react';
import LoadPersonal1854Wallet, {
  PersonalWallet,
} from './load-personal-1854-wallet';
import SharedWallets from './shared-wallets';

export function App() {
  const [wallet, setWallet] = useState<PersonalWallet | undefined>();
  return (
    <div>
      <LoadPersonal1854Wallet onCreated={setWallet} />
      {wallet && <SharedWallets personalWallet={wallet} />}
    </div>
  );
}

export default App;
