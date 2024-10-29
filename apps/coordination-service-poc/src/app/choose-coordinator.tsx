import { Coordinator } from 'coordinator';
import { NotImplementedError } from '@cardano-sdk/core';
import { PeerbitCoordinator } from 'peerbit-coordinator';
import { logger } from './config';
import { PersonalWallet } from './load-personal-1854-wallet';
import { useState } from 'react';
import { GunCoordinator } from './GunCoordinator';

export type CreateSharedWalletProps = {
  personalWallet: PersonalWallet;
  onCoordinatorChosen: (coordinator: Coordinator) => void;
};

const CHOOSE_LABEL = 'Choose coordinator';
const PEERBIT = 'peerbit';
const GUN = 'gun';

function createCoordinator(
  value: string,
  personalWallet: PersonalWallet
): Promise<Coordinator> {
  switch (value) {
    case PEERBIT:
      return PeerbitCoordinator.create(
        personalWallet.keyAgent.extendedAccountPublicKey,
        logger
      );
    case GUN:
      return GunCoordinator.create(
        personalWallet.keyAgent.extendedAccountPublicKey,
        logger
      );
    default:
      throw new NotImplementedError(`Coordinator "${value}"`);
  }
}

export function ChooseCoordinator({
  personalWallet,
  onCoordinatorChosen,
}: CreateSharedWalletProps) {
  const [chosen, setChosen] = useState(false);
  return (
    <div>
      <select
        disabled={chosen}
        onChange={(e) =>
          e.target.value &&
          e.target.value !== 'CHOOSE_LABEL' &&
          !!createCoordinator(e.target.value, personalWallet).then(
            onCoordinatorChosen
          ) &&
          setChosen(true)
        }
      >
        <option>{CHOOSE_LABEL}</option>
        <option value={PEERBIT} label="Peerbit" />
        <option value={GUN} label="GUN" />
      </select>
    </div>
  );
}

export default ChooseCoordinator;
