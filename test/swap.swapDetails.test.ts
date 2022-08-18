import { expect } from 'chai';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import moment from 'moment';

const initialSupply = ethers.utils.parseEther('1000');

describe('HedgeyDAOSwap contract init swap', () => {
  let hedgeyDAOSwap: Contract;
  let tokenA: Contract;
  let tokenB: Contract;
  let hedgeys: Contract;

  let initiator: Signer;
  let initiatorAddress: String;

  let executor: Signer;
  let executorAddress: string;

  let swapId: string;

  const amountA = ethers.utils.parseEther('1');
  const amountB = ethers.utils.parseEther('1');
  const unlockDate = moment().add(1, 'day').unix();

  before(async () => {
    const Token = await ethers.getContractFactory('Token');
    const Weth = await ethers.getContractFactory('WETH9');
    const Hedgeys = await ethers.getContractFactory('Hedgeys');

    tokenA = await Token.deploy(initialSupply, 'TokenA', 'TKNA');
    tokenB = await Token.deploy(initialSupply, 'TokenB', 'TKNB');
    const weth = await Weth.deploy();
    hedgeys = await Hedgeys.deploy(weth.address, '');

    const HedgeyDAOSwap = await ethers.getContractFactory('HedgeyDAOSwap');
    hedgeyDAOSwap = await HedgeyDAOSwap.deploy();

    const accounts = await ethers.getSigners();

    initiator = accounts[3];
    initiatorAddress = await initiator.getAddress();

    executor = accounts[4];
    executorAddress = await executor.getAddress();

    await tokenA.transfer(initiatorAddress, amountA);
    tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);

    const swapTransation = await hedgeyDAOSwap
      .connect(initiator)
      .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, executorAddress, hedgeys.address);
    const receipt = await swapTransation.wait();
    const event = receipt.events.find((event: any) => event.event === 'NewSwap');
    swapId = event.args.id;
  });

  it('should get swap details', async () => {
    const swap = await hedgeyDAOSwap.getSwapDetails(swapId);
    expect(swap.tokenA).to.be.eq(tokenA.address);
    expect(swap.tokenB).to.be.eq(tokenB.address);
    expect(swap.amountA).to.be.eq(amountA);
    expect(swap.amountB).to.be.eq(amountB);
    expect(swap.unlockDate).to.be.eq(unlockDate);
    expect(swap.initiator).to.be.eq(initiatorAddress);
    expect(swap.executor).to.be.eq(executorAddress);
    expect(swap.nftLocker).to.be.eq(hedgeys.address);
  });

  it('should throw an error when the swap with ID does not exist', async () => {
    await expect(hedgeyDAOSwap.getSwapDetails(1000)).to.be.revertedWith('Swap does not exist');
  });
});
