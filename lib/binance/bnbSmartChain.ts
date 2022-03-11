import Web3 from 'web3';
import { CurrencyHandler } from '../base';
const Web3Constructor = require('web3');

export class BnbBscHandler extends CurrencyHandler {
  private privateKey: string;

  protected urlProvider: string;
  protected rpcUrl: string;
  protected web3: Web3;

  constructor() {
    super();
    this.urlProvider = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
    this.web3 = new Web3Constructor(new Web3Constructor.providers.HttpProvider(this.urlProvider));
    // Provide privateKey for the account to be able to interact
    this.privateKey = process.env['BNB_SMART_CHAIN_PRIVATE_KEY'];
  }

  public getNetworkInfo() {
    return { network: 'binance_smart_chain', testnet: 'testnet' };
  }

  public async getAmount(): Promise<number> {
    const address = await this.getAddress();
    const balance = await this.web3.eth.getBalance(address);
    return parseFloat(balance) * 10e-19;
  }

  public async getTokensFromFaucet(): Promise<void> {
    // TODO: Implement function
    // URL: https://testnet.binance.org/faucet-smart
  }

  public async performTransaction(address: string, amount: number): Promise<string> {
    const account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
    const wallet = this.web3.eth.accounts.wallet.add(account);

    // The gas price is determined by the last few blocks median gas price.
    const avgGasPrice = await this.web3.eth.getGasPrice();
    console.log(`Average gas price ${avgGasPrice}`);

    const createTransaction = await this.web3.eth.accounts.signTransaction(
      {
        from: wallet.address,
        to: address,
        value: this.web3.utils.toWei(amount.toString(), 'ether'),
        gas: 21000,
        gasPrice: avgGasPrice,
      },
      wallet.privateKey,
    );
    // Deploy transaction
    const createReceipt = await this.web3.eth.sendSignedTransaction(createTransaction.rawTransaction);
    return createReceipt.transactionHash;
  }

  public async getAddress(): Promise<string> {
    const account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
    return account.address;
  }

  public async waitForIncoming(amount: number, startBlock: number = null): Promise<void> {
    // TODO
  }

  public async disconnect(): Promise<void> {
    this.web3.eth.clearSubscriptions((err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`All the subscriptions cleared -> ${result}`);
      }
    });
  }
}
