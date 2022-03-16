import { CurrencyHandler } from '../base';
import { Client, TransferTransaction, AccountBalanceQuery } from '@hashgraph/sdk';

export class HederaHandler extends CurrencyHandler {
  protected client: Client;
  protected privateKey: string;
  protected accountId: string;

  constructor() {
    super();
    this.client = Client.forTestnet();
    this.privateKey = process.env.HEDERA_PRIVATE_KEY;
    this.accountId = process.env.HEDERA_ACCOUNT_ID;
    // Connecting to wallet credentials
    this.client.setOperator(this.accountId, this.privateKey);
  }

  public getNetworkInfo() {
    return { network: 'hedera', testnet: 'testnet' };
  }

  public async getAmount(): Promise<number> {
    const accountBalance = await new AccountBalanceQuery().setAccountId(this.accountId).execute(this.client);
    return parseFloat(accountBalance.hbars.toString());
  }

  public async getTokensFromFaucet(): Promise<void> {
    // NOTE: Only way to get HBAR from faucet is registering in hedera portal with new account and get 10000 HBARs
  }

  public async performTransaction(address: string, amount: number, memo?: string): Promise<string> {
    //Create the transfer transaction
    const sendHbar = await new TransferTransaction()
      .addHbarTransfer(this.accountId, -1 * amount)
      .addHbarTransfer(address, amount)
      .setTransactionMemo(memo)
      .execute(this.client);

    //Verify the transaction reached consensus
    const transactionReceipt = await sendHbar.getReceipt(this.client);
    console.log(`The transaction has status: ${transactionReceipt.status.toString()}`);

    //Request the cost of the query
    const queryCost = await new AccountBalanceQuery().setAccountId(address).getCost(this.client);
    console.log('The cost of query is: ' + queryCost);

    return transactionReceipt.status.toString();
  }

  public async getAddress(): Promise<string> {
    return this.accountId;
  }

  public async waitForIncoming(amount: number, startBlock: number = null): Promise<void> {
    // TODO
  }
  public async disconnect(): Promise<void> {
    // TODO
  }
}
