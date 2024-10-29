import { Cardano } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';

export const chainId = Cardano.ChainIds.Preview;

export const bip32Ed25519 = new SodiumBip32Ed25519();

export const logger = console;
