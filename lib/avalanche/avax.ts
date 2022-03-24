import { JsonRpcProvider } from '@ethersproject/providers';
import { Avalanche, evm } from 'avalanche';
import { ethers, Wallet } from 'ethers';
import { CurrencyHandler } from '../base';

interface gasFees {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export class AvaxHandler extends CurrencyHandler {
  protected wallet: Wallet;
  protected provider: JsonRpcProvider;
  protected cchain: evm.EVMAPI;

  constructor() {
    super();
    const nodeURL = 'https://api.avax-test.network/ext/bc/C/rpc';
    this.provider = new ethers.providers.JsonRpcProvider(nodeURL);
    let seedPhrase = process.env['AVALANCHE_SEED_PHRASE'];
    const wallet = ethers.utils.HDNode.fromMnemonic(seedPhrase);
    this.wallet = new ethers.Wallet(wallet, this.provider);
    const avalanche = new Avalanche('api.avax-test.network', undefined, 'https', 43113);
    this.cchain = avalanche.CChain();
  }

  public getNetworkInfo() {
    return { network: 'avalanche', testnet: 'fuji' };
  }

  public async getAmount(): Promise<number> {
    const balance = await this.wallet.getBalance();
    return parseFloat(ethers.utils.formatEther(balance));
  }

  public async getTokensFromFaucet(): Promise<void> {
    console.log('Navigate to the following url -> https://faucet.avax-test.network/');
  }

  private async calcFeeData(maxFeePerGas = undefined, maxPriorityFeePerGas = undefined): Promise<gasFees> {
    const baseFee = parseInt(await this.cchain.getBaseFee(), 16) / 1e9;
    maxPriorityFeePerGas =
      maxPriorityFeePerGas == undefined
        ? parseInt(await this.cchain.getMaxPriorityFeePerGas(), 16) / 1e9
        : maxPriorityFeePerGas;
    maxFeePerGas = maxFeePerGas == undefined ? baseFee + maxPriorityFeePerGas : maxFeePerGas;

    if (maxFeePerGas < maxPriorityFeePerGas) {
      throw 'Error: Max fee per gas cannot be less than max priority fee per gas';
    }

    return {
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    };
  }

  public async performTransaction(address: string, amount: number): Promise<any> {
    const nonce = await this.provider.getTransactionCount(address);
    // If the max fee or max priority fee is not provided, then it will automatically calculate using CChain APIs
    const fees = await this.calcFeeData();
    const maxFeePerGas = ethers.utils.parseUnits(fees.maxFeePerGas, 'gwei');
    const maxPriorityFeePerGas = ethers.utils.parseUnits(fees.maxPriorityFeePerGas, 'gwei');
    // Type 2 transaction is for EIP1559 (Needs to be at least npm ether version 5.6.0)
    const tx = {
      type: 2,
      from: await this.getAddress(),
      nonce: nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit: null,
      to: address,
      value: ethers.utils.parseEther(`${amount}`),
      chainId: 43113,
    };
    tx.gasLimit = (await this.provider.estimateGas(tx)).toNumber() * 1.5;
    const signedTx = await this.wallet.signTransaction(tx);
    const txHash = ethers.utils.keccak256(signedTx);
    console.log('Sending signed transaction');
    // Sending a signed transaction and waiting for its inclusion
    await (await this.provider.sendTransaction(signedTx)).wait();
    // Check transactions https://testnet.snowtrace.io
    console.log(`Completed transaction with nonce ${nonce} and hash ${txHash}`);
  }

  public async getAddress(): Promise<string> {
    return this.wallet.address;
  }

  public async waitForIncoming(): Promise<void> {
    // TODO
  }

  public async disconnect(): Promise<void> {
    try {
      await this.provider.removeAllListeners();
    } catch (error) {
      console.error(`Error disconnecting ETH -> ${error}`);
    }
  }
}
