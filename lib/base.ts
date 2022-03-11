export abstract class CurrencyHandler {
  public abstract getAddress(): Promise<string>;

  public abstract getAmount(): Promise<number>;

  public abstract getTokensFromFaucet(): Promise<void>;

  public abstract performTransaction(address: string, amount: number, memo?: string): Promise<string>;

  public abstract getNetworkInfo(): { network: string; testnet: string };

  public async waitForIncoming(amount: number): Promise<void> {
    // This is very flaky in case that the transaction is already there
    const baseAmount = await this.getAmount();
    let currentAmount = baseAmount;

    while (currentAmount < baseAmount + amount) {
      await new Promise((r) => setTimeout(r, 2000));
      currentAmount = await this.getAmount();
    }
  }

  public abstract disconnect(): Promise<void>;
}
