import { EtherscanProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { CurrencyHandler } from '../base';
import ethers = require('ethers');

export class EthHandler extends CurrencyHandler {
  protected wallet: Wallet;
  protected provider: EtherscanProvider;
  protected testnet: string;

  constructor(testnet = 'ropsten') {
    super();
    this.testnet = testnet;
    if (process.env['ETHEREUM_SCAN_TOKEN']) {
      this.provider = ethers.getDefaultProvider(testnet, {
        etherscan: process.env['ETHEREUM_SCAN_TOKEN'],
      }) as EtherscanProvider;
    } else {
      this.provider = ethers.getDefaultProvider(testnet) as EtherscanProvider;
    }
    let seedPhrase = process.env['ETHEREUM_SEED_PHRASE'];
    const wallet = ethers.ethers.utils.HDNode.fromMnemonic(seedPhrase);
    this.wallet = new ethers.Wallet(wallet, this.provider);
  }

  public getNetworkInfo() {
    return { network: 'ethereum', testnet: this.testnet };
  }

  public async getAmount(): Promise<number> {
    const balance = await this.wallet.getBalance();
    return parseFloat(ethers.utils.formatEther(balance));
  }

  public async getTokensFromFaucet(): Promise<void> {
    const address = await this.wallet.getAddress();
    throw new Error(`No faucet automation for ETH in ${this.testnet}, top up ${address} manually`);
  }

  public async performTransaction(address: string, amount: number): Promise<string> {
    const transactionRequest: ethers.ethers.utils.Deferrable<ethers.ethers.providers.TransactionRequest> = {
      to: address,
      value: ethers.utils.parseEther(amount.toString()),
    };

    // Higher gas limit and gas price to speed-up transaction
    const gasPrice = await this.wallet.getGasPrice();
    const gasLimit = await this.wallet.estimateGas(transactionRequest);
    transactionRequest.gasLimit = gasLimit.toNumber() * 2;
    transactionRequest.gasPrice = gasPrice.toNumber() * 2;

    if ((await this.getAmount()) < amount) {
      throw new Error('Not enough currency to perform transaction');
    }
    const transaction = await this.wallet.sendTransaction(transactionRequest);
    await this.wallet.provider.waitForTransaction(transaction.hash);
    return transaction.hash;
  }

  public async getAddress(): Promise<string> {
    return this.wallet.address;
  }

  public async waitForIncoming(amount: number, startBlock: number = null): Promise<void> {
    let count = 60;
    let history = await this.provider.getHistory(this.wallet.address, startBlock);
    let last = history[history.length - 1];

    do {
      console.log(`Last value ${ethers.utils.formatEther(last.value)} and expected ${amount}`);
      if (ethers.utils.formatEther(last.value) === amount.toString()) {
        break;
      } else {
        await new Promise((r) => setTimeout(r, 10000));
        count -= 1;
        history = await this.provider.getHistory(this.wallet.address, startBlock);
        last = history[history.length - 1];
      }
    } while (count > 0);

    if (count === 0) {
      console.warn(`ETH ${amount} was not received in 10 minutes`);
      throw new Error("Funds didn't arrive to external wallet");
    } else {
      // transaction is here, wait for it to complete
      console.log(`Transaction hash ${history[history.length - 1].hash}`);
      await this.provider.waitForTransaction(history[history.length - 1].hash, 2);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.provider.removeAllListeners();
    } catch (error) {
      console.error(`Error disconnecting ETH -> ${error}`);
    }
  }
}
