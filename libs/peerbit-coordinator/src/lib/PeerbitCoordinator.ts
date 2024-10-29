import {
  Bip32PublicKey,
  Bip32PublicKeyHex,
  Ed25519PublicKey,
  Ed25519PublicKeyHex,
  Ed25519Signature,
  Ed25519SignatureHex,
} from '@cardano-sdk/crypto';
import {
  catchError,
  concat,
  concatMap,
  EMPTY,
  fromEvent,
  interval,
  merge,
  Observable,
  shareReplay,
} from 'rxjs';
import type {
  Coordinator,
  SharedWallet,
  SharedWalletAddress,
} from 'coordinator';
import { Cardano, Serialization } from '@cardano-sdk/core';
import { field, variant, vec } from '@dao-xyz/borsh';
import { HexBlob } from '@cardano-sdk/util';
import { Documents, SearchRequest } from '@peerbit/document';
import { Program } from '@peerbit/program';
import { CreateInstanceOptions, Peerbit } from 'peerbit';
import { type ReplicationOptions } from '@peerbit/shared-log';
import { Logger } from 'ts-log';
import { AccountKeyDerivationPath, KeyRole } from '@cardano-sdk/key-management';
import { sha256Sync } from '@peerbit/crypto';
import { multiaddr } from '@multiformats/multiaddr';

type Args = { replicate: ReplicationOptions };

const IDENTITY_KEY_DERIVATION_PATH: AccountKeyDerivationPath = {
  role: 1234 as KeyRole,
  index: 1234,
};
const IDENTITY_KEY_DERIVATION_INDICES: number[] = [
  IDENTITY_KEY_DERIVATION_PATH.role,
  IDENTITY_KEY_DERIVATION_PATH.index,
];

export type KeyOwnershipProof = {
  publicKey: Ed25519PublicKeyHex;
  payload: HexBlob;
  signature: Ed25519SignatureHex;
};

export type PeerbitIdentity = {
  peerbitPublicKey: string;
  peerbitPrivateKey: string;
};

export type PeerbitIdentityBackup = {
  encryptedPeerbitKeyPair: string;
};

@variant(0) // version 0
export class AddressDocument {
  @field({ type: 'string' })
  paymentAddress: Cardano.PaymentAddress;

  @field({ type: 'string' })
  paymentScriptCbor: HexBlob;

  @field({ type: 'string' })
  stakingScriptCbor: HexBlob;

  @field({ type: vec('u64') })
  paymentKeyPath: [KeyRole, number];

  @field({ type: vec('u64') })
  stakingKeyPath: [KeyRole, number];

  constructor({
    address,
    paymentScript,
    stakingScript,
    paymentKeyPath,
    stakingKeyPath,
  }: SharedWalletAddress) {
    this.paymentAddress = address;
    this.paymentScriptCbor = paymentScript.toCbor();
    this.stakingScriptCbor = stakingScript.toCbor();
    this.paymentKeyPath = [paymentKeyPath.role, paymentKeyPath.index];
    this.stakingKeyPath = [stakingKeyPath.role, stakingKeyPath.index];
  }
}

@variant(0)
export class SharedWalletDocument {
  @field({ type: 'string' })
  id: string;

  @field({ type: vec(AddressDocument) })
  addresses: AddressDocument[];

  @field({ type: vec('string') })
  coSigners: Bip32PublicKeyHex[];

  constructor({ coSigners, addresses: scripts }: SharedWallet) {
    this.id = SharedWalletDocument.ComputeId(coSigners);
    this.coSigners = coSigners;
    this.addresses = scripts.map((address) => new AddressDocument(address));
  }

  static ComputeId(coSigners: Bip32PublicKeyHex[]) {
    return coSigners.join(); // hash?
  }
}

const IDENTITY_ID_PROPERTY = 'publicKey';

@variant(0)
export class IdentityDocument {
  @field({ type: 'string' })
  [IDENTITY_ID_PROPERTY]: Ed25519PublicKeyHex;

  @field({ type: 'string' })
  payload: HexBlob;

  @field({ type: 'string' })
  signature: Ed25519SignatureHex;

  @field({ type: 'string' })
  encryptedPeerbitKeyPair: string;

  constructor(
    { payload, publicKey, signature }: KeyOwnershipProof,
    { encryptedPeerbitKeyPair }: PeerbitIdentityBackup
  ) {
    this.publicKey = publicKey;
    this.payload = payload;
    this.signature = signature;
    this.encryptedPeerbitKeyPair = encryptedPeerbitKeyPair;
  }
}

@variant('shared-wallets')
export class SharedWalletsProgram extends Program {
  @field({ type: Documents })
  sharedWallets: Documents<SharedWalletDocument>;

  @field({ type: Documents })
  identities: Documents<IdentityDocument>;

  constructor() {
    super();
    this.sharedWallets = new Documents({
      id: sha256Sync(new TextEncoder().encode('sharedWallets')),
    });
    this.identities = new Documents({
      id: sha256Sync(new TextEncoder().encode('identities')),
    });
  }

  async open(args?: Args): Promise<void> {
    await this.identities.open({
      type: IdentityDocument,
      // replicate: args?.replicate,
      // we could add a signature field with cip8 structure
      // and require it to be signed in cip8 format with key of one of the co-signers
      canPerform: async (entry) => {
        if (entry.type === 'delete') return false;
        const { publicKey, payload, signature } = entry.value;
        const key = Ed25519PublicKey.fromHex(publicKey);
        return key.verify(Ed25519Signature.fromHex(signature), payload);
      },
      // if someone create an identity, should I, as a Replicator, start/open it?
      canOpen: async (_entry) => true,
      // canOpen: (wallet: SharedWalletDocument) => {
      //   return !this.xpub || wallet.coSigners.includes(this.xpub);
      // },
      index: {
        type: IdentityDocument,
        idProperty: IDENTITY_ID_PROPERTY,
        // canRead: () => true,
        // canSearch: () => true,
        transform: async (identity) => identity,
      },
    });
    await this.sharedWallets.open({
      type: SharedWalletDocument,
      // replicate: args?.replicate,
      // who can create a shared wallet?
      // we could add a signature field with cip8 structure
      // and require it to be signed in cip8 format with key of one of the co-signers
      canPerform: async (_entry) => true,
      // if someone create a shared wallet, should I, as a Replicator, start/open it?
      canOpen: async (_entry) => true,
      // canOpen: (wallet: SharedWalletDocument) => {
      //   return !this.xpub || wallet.coSigners.includes(this.xpub);
      // },
      // index: {
      //   type: SharedWalletDocument,
      //   canRead: () => true,
      //   canSearch: () => true,
      //   transform: async (wallet) => wallet,
      // },
    });
  }
}

export class PeerbitCoordinator implements Coordinator {
  readonly db: SharedWalletsProgram;
  readonly sharedWallets$: Observable<SharedWallet[]>;

  private constructor(
    _xpub: Bip32PublicKeyHex,
    db: SharedWalletsProgram,
    logger: Logger
  ) {
    this.db = db;
    const query$ = new Observable<SharedWallet[]>((observer) => {
      logger.debug('query', db);
      this.db.sharedWallets.index
        .search(new SearchRequest({ query: [] }), {
          local: true,
          remote: true,
        })
        .then((docs) => {
          logger.debug('found', docs);
          observer.next(
            docs.map((walletDoc) => ({
              addresses: walletDoc.addresses.map(
                ({
                  paymentAddress,
                  paymentKeyPath,
                  paymentScriptCbor,
                  stakingKeyPath,
                  stakingScriptCbor,
                }): SharedWalletAddress => ({
                  paymentKeyPath: {
                    role: paymentKeyPath[0],
                    index: paymentKeyPath[1],
                  },
                  stakingKeyPath: {
                    role: stakingKeyPath[0],
                    index: stakingKeyPath[1],
                  },
                  address: paymentAddress,
                  paymentScript:
                    Serialization.NativeScript.fromCbor(paymentScriptCbor),
                  stakingScript:
                    Serialization.NativeScript.fromCbor(stakingScriptCbor),
                })
              ),
              coSigners: walletDoc.coSigners,
            }))
          );
          observer.complete();
        })
        .catch(observer.error);
    });
    const handleError = <T>(source$: Observable<T>) =>
      source$.pipe(
        catchError((error) => {
          logger.error('Failed to query wallets', error);
          return EMPTY;
        })
      );
    this.sharedWallets$ = concat(
      query$.pipe(handleError),
      merge(
        fromEvent(this.db.sharedWallets.events, 'change'),
        interval(1000)
      ).pipe(concatMap(() => query$.pipe(handleError)))
    ).pipe(shareReplay(1));
  }

  async createSharedWallet(sharedWallet: SharedWallet): Promise<void> {
    await this.db.sharedWallets.put(new SharedWalletDocument(sharedWallet));
  }

  static async connect(options?: CreateInstanceOptions) {
    const peer = await Peerbit.create({
      libp2p: { connectionGater: { denyDialMultiaddr: () => false } },
      ...options,
    });
    // await peer.bootstrap();
    await peer.dial(
      [
        '/ip4/127.0.0.1/tcp/8002/ws/p2p/12D3KooWN8DRJNFmf1T3oJnuwvQjzA1t5MKEGujrqRtzeTvuvd8K',
        '/ip4/127.0.0.1/tcp/8001/p2p/12D3KooWN8DRJNFmf1T3oJnuwvQjzA1t5MKEGujrqRtzeTvuvd8K',
      ].map(multiaddr)
    );

    const db = await peer.open(new SharedWalletsProgram());
    return { peer, db };
  }

  static async restoreIdentity(
    xpub: Bip32PublicKeyHex
  ): Promise<PeerbitIdentityBackup | null> {
    const { peer, db } = await this.connect();
    await db.identities.log.replicate({ factor: 1 });
    try {
      const identityKey = await Bip32PublicKey.fromHex(xpub).derive(
        IDENTITY_KEY_DERIVATION_INDICES
      );
      const identities = await db.identities.index.search(
        new SearchRequest({
          query: {
            [IDENTITY_ID_PROPERTY]: identityKey.toRawKey().hex(),
          },
        }),
        { remote: true, local: true }
      );
      if (identities.length === 0) return null;
      return identities[0];
    } finally {
      await db.close();
      await peer.stop();
    }
  }

  static async create(xpub: Bip32PublicKeyHex, logger: Logger) {
    const { db } = await this.connect();
    await db.sharedWallets.log.replicate({ factor: 1 });
    return new PeerbitCoordinator(xpub, db, logger);
  }
}
