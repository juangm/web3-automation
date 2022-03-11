import { BncClient, crypto } from '@binance-chain/javascript-sdk';
import got, { Got } from 'got';
import { CurrencyHandler } from '../base';

export class BnbBcHandler extends CurrencyHandler {
  private privateKey: string;

  protected apiUrl: string;
  protected client: BncClient;
  protected rpcUrl: string;
  protected got: Got;

  constructor() {
    super();
    this.apiUrl = 'https://testnet-dex.binance.org/';
    this.rpcUrl = 'https://data-seed-prebsc-1-s2.binance.org:8545/';
    this.client = new BncClient(this.apiUrl);
    this.privateKey = process.env['BNB_CHAIN_PRIVATE_KEY'];
    this.client.chooseNetwork('testnet');
    this.client.setPrivateKey(this.privateKey);
    this.client.initChain();
    this.got = got.extend({
      prefixUrl: this.apiUrl,
      responseType: 'json',
    });
  }

  public getNetworkInfo() {
    return { network: 'binance_chain', testnet: 'testnet' };
  }

  public async getAmount(): Promise<number> {
    const address = await this.getAddress();
    const balance = await this.client.getBalance(address);
    return parseFloat(balance);
  }

  public async getTokensFromFaucet(): Promise<void> {
    // TODO: Implement function
  }

  public async performTransaction(address: string, amount: number): Promise<string> {
    const addressFrom = await this.client.getClientKeyAddress();
    const sequenceURL = `api/v1/account/${addressFrom}/sequence`;
    const sequence = await this.got.get(sequenceURL);
    const result = await this.client.transfer(
      addressFrom,
      address,
      amount,
      'BNB',
      'Automate test transaction',
      sequence.body['sequence'],
    );
    if (result.status === 200) {
      console.log(`Success transaction with hast ${result.result[0].hash}`);
    } else {
      console.error(`error -> ${result}`);
      throw new Error('Problem happen when doing transaction');
    }
    return result.result[0].hash;
  }

  public async getAddress(): Promise<string> {
    return await crypto.getAddressFromPrivateKey(this.privateKey);
  }

  public async waitForIncoming(amount: number, startBlock: number = null): Promise<void> {
    // TODO
  }
  public async disconnect(): Promise<void> {
    // TODO
  }
}
