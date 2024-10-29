import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { NEVER, Observable } from 'rxjs';
import { Coordinator, SharedWallet } from 'coordinator';
import { Logger } from 'ts-log';
import GUN from 'gun/gun';
import { PaymentAddress } from '@cardano-sdk/core/dist/cjs/Cardano';
import { IGunInstance } from 'gun';

type SharedWalletsSchema = {
  sharedWallets: {
    [key: Bip32PublicKeyHex]: {
      [id: string]: {
        addresses: {
          [address: PaymentAddress]: {
            script: string;
          };
        };
      };
    };
  };
};

export class GunCoordinator implements Coordinator {
  readonly sharedWallets$: Observable<SharedWallet[]>;

  private constructor(db: IGunInstance<SharedWalletsSchema>, logger: Logger) {
    // db.put();
    this.sharedWallets$ = NEVER;
  }

  async createSharedWallet(sharedWallet: SharedWallet): Promise<void> {
    // await this.db.sharedWallets.put(new SharedWalletDocument(sharedWallet));
  }

  static async create(xpub: Bip32PublicKeyHex, logger: Logger) {
    const gun = GUN<SharedWalletsSchema>({
      peers: ['http://localhost:8080/gun'],
    });
    return new GunCoordinator(gun, logger);
  }
}
