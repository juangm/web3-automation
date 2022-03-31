import { CurrencyHandler } from '../base';
import { decode } from 'bs58';
import {
  Keypair,
  Connection,
  clusterApiUrl,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';

export class SolHandler extends CurrencyHandler {
  protected wallet: Keypair;
  protected provider: Connection;

  constructor(otherAccount: string = null) {
    super();
    const privateKey = otherAccount === null ? process.env.SOLANA_PRIVATE_KEY : otherAccount;
    this.wallet = Keypair.fromSecretKey(decode(privateKey));
    this.provider = new Connection(clusterApiUrl('testnet'), 'confirmed');
  }

  public getNetworkInfo() {
    return { network: 'solana', testnet: 'testnet' };
  }

  public async getAmount(): Promise<number> {
    const amount = await this.provider.getBalance(this.wallet.publicKey);
    return amount / LAMPORTS_PER_SOL;
  }

  public async getTokensFromFaucet(): Promise<void> {
    const airdropSignature = await this.provider.requestAirdrop(this.wallet.publicKey, LAMPORTS_PER_SOL);
    //wait for airdrop confirmation
    await this.provider.confirmTransaction(airdropSignature);
  }

  public async performTransaction(address: string, amount: number): Promise<any> {
    const receiverPublicKey = new PublicKey(address);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: receiverPublicKey,
        lamports: LAMPORTS_PER_SOL * amount,
      }),
    );

    // Sign transaction, broadcast, and confirm
    var signature = await sendAndConfirmTransaction(this.provider, transaction, [this.wallet]);
    console.log('SIGNATURE -> ', signature);
  }

  public async getAddress(): Promise<string> {
    return this.wallet.publicKey.toString();
  }

  public async waitForIncoming(): Promise<void> {
    // TODO
  }

  public async disconnect(): Promise<void> {}
}
