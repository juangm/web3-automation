import { Erc20Handler } from './baseERC20';

// NOTE: Just add the class per ERC20 Token with contract, decimal and testnet
export class UsdtHandler extends Erc20Handler {
  constructor() {
    super('0x6ee856ae55b6e1a249f04cd3b947141bc146273c', 6, 'ropsten');
  }
}
