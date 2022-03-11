import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { CurrencyHandler } from '../base';

export class DotHandler extends CurrencyHandler {
  protected wallet: KeyringPair;
  protected provider: WsProvider;
  protected api: ApiPromise;

  constructor() {
    super();
    this.provider = new WsProvider('wss://westend-rpc.polkadot.io');
    this.api = new ApiPromise({ provider: this.provider });
    let seedPhrase = process.env['POLKADOT_SEED_PHRASE'];
    this.wallet = new Keyring({ type: 'sr25519' }).addFromUri(seedPhrase);
  }

  public getNetworkInfo() {
    return { network: 'polkadot', testnet: 'westend' };
  }

  public async getAmount(): Promise<number> {
    // Wait for connection
    await this.api.isReady;

    const address = await this.getAddress();
    const {
      data: { free: previousFree },
      nonce: previousNonce,
    } = (await this.api.query.system.account(address)) as any;
    console.log(`The account has a balance of ${previousFree.toHuman()}`);
    return parseInt(previousFree.toString()) / 1000000000000;
  }

  public async getTokensFromFaucet(): Promise<void> {
    // NOT Possible to automate at the moment
    // Navigate to https://app.element.io/#/room/#westend_faucet:matrix.org
    // Send message !drip <address>
  }

  public async performTransaction(address: string, amount: number): Promise<string> {
    await this.api.isReady;
    // retrieve sender's next index/nonce, taking txs in the pool into account
    const nonce = await this.api.rpc.system.accountNextIndex(this.wallet.address);
    // Create a extrinsic
    amount *= 1000000000000;
    const transfer = await this.api.tx.balances.transfer(address, amount);
    // Retrieve the payment info
    const { partialFee, weight } = await transfer.paymentInfo(this.wallet);
    console.log(`Transaction will have a fee of ${partialFee.toHuman()}`);
    // Sign and send the transaction using our account
    const hash = await transfer.signAndSend(this.wallet, { nonce: nonce });
    console.log('Transfer sent with hash', hash.toHex());
    return hash.toHex();
  }

  public async getAddress(): Promise<string> {
    return await this.wallet.address;
  }

  public async waitForIncoming(amount: number, startBlock: number = null): Promise<void> {}

  public async disconnect(): Promise<void> {
    try {
      await this.api.disconnect();
      await this.provider.disconnect();
    } catch (error) {
      console.error(`Error when disconnecting DOT -> ${error}`);
    }
  }
}
