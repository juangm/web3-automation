import { CurrencyHandler } from '../base';
import ethers = require('ethers');
import { Wallet, Contract } from 'ethers';
import { EtherscanProvider } from '@ethersproject/providers';

export abstract class Erc20Handler extends CurrencyHandler {
  protected wallet: Wallet;
  protected provider: EtherscanProvider;
  protected network: string;
  protected decimals: number;
  private contract: Contract;

  constructor(contractAddress: string, precision: number, testnet = 'ropsten') {
    super();
    this.decimals = precision;
    this.network = testnet;
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
    const partialAbi = [
      {
        constant: true,
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
      {
        constant: false,
        inputs: [
          { internalType: 'address', name: '_to', type: 'address' },
          { internalType: 'uint256', name: '_value', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];
    this.contract = new ethers.Contract(contractAddress, partialAbi, this.wallet);
  }

  public getNetworkInfo() {
    return { network: 'ethereum', testnet: this.network };
  }

  public async getAmount(): Promise<number> {
    const address = await this.wallet.getAddress();
    const balance = await this.contract.balanceOf(address);
    return parseFloat(ethers.utils.formatUnits(balance, this.decimals));
  }

  public async getTokensFromFaucet(): Promise<void> {
    // Check for each ERC20 token
    const address = await this.wallet.getAddress();
    throw new Error(`No faucet available for TOKEN ERC20, top up ${address} manually`);
  }

  public async performTransaction(address: string, amount: number): Promise<string> {
    if ((await this.getAmount()) < amount) {
      throw new Error('Not enough currency to perform transaction');
    }
    const transaction = await this.contract.transfer(
      address,
      ethers.utils.parseUnits(amount.toString(), this.decimals),
    );
    await this.wallet.provider.waitForTransaction(transaction.hash);
    return transaction.hash;
  }

  public async getAddress(): Promise<string> {
    return this.wallet.address;
  }

  public async waitForIncoming(amount: number): Promise<void> {
    let count = 60;
    let history = await this.provider.getHistory(this.wallet.address);
    let last = history[history.length - 1];

    do {
      last = history[history.length - 1];
      console.log(
        `Last value ${parseFloat(ethers.utils.formatUnits(last.value, this.decimals))} and expected ${amount}`,
      );
      if (parseFloat(ethers.utils.formatUnits(last.value, this.decimals)) === amount) {
        break;
      } else {
        count -= 1;
        await new Promise((r) => setTimeout(r, 10000));
        history = await this.provider.getHistory(this.wallet.address);
      }
    } while (count > 0);

    if (count === 0) {
      console.warn(`Token ${amount} was NOT received in 10 minutes`);
      throw new Error("Funds didn't arrive to external wallet");
    } else {
      // transaction is here, wait for it to complete
      console.log(`Transaction hash ${last.hash}`);
      await this.provider.waitForTransaction(last.hash, 2);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.provider.removeAllListeners();
    } catch (error) {
      console.error(`Failed to disconnect ERC20 -> ${error}`);
    }
  }
}
