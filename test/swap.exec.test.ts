import { expect } from 'chai';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import moment from 'moment';
import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

const initialSupply = ethers.utils.parseEther('1000');

describe('HedgeyDAOSwap contract execute swap', () => {
  let hedgeyDAOSwap: Contract;
  let tokenA: Contract;
  let tokenB: Contract;
  let hedgeys: Contract;

  let initiator: Signer;
  let initiatorAddress: String;

  let executor: Signer;
  let executorAddress: string;

  let snapshot: SnapshotRestorer;

  const initSwap = async (unlockDate: number): Promise<string> => {
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');

    await tokenA.transfer(initiatorAddress, amountA);
    await tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);

    const initSwapTransaction = await hedgeyDAOSwap
      .connect(initiator)
      .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, executorAddress, hedgeys.address);
    const receipt = await initSwapTransaction.wait();
    const event = receipt.events.find((event: any) => event.event === 'NewSwap');
    return event.args.id;
  };

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
    snapshot = await takeSnapshot();
  });

  it('should execute a swap with a date in the future', async () => {
    await snapshot.restore();
    const unlockDate = moment().add(1, 'day').unix();
    const swapId = await initSwap(unlockDate);
    const amountB = ethers.utils.parseEther('1');
    await tokenB.transfer(executorAddress, amountB);
    await tokenB.connect(executor).approve(hedgeyDAOSwap.address, amountB);
    const executeSwapTransaction = await hedgeyDAOSwap.connect(executor).executeSwap(swapId);
    const receipt = await executeSwapTransaction.wait();
    const event = receipt.events.find((event: any) => event.event === 'SwapExecuted');
    expect(event.args.id).to.be.eq(swapId);
    const hedgeyExecutorBalance = await hedgeys.balanceOf(executorAddress);
    const hedgeyInitiatorBalance = await hedgeys.balanceOf(initiatorAddress);
    expect(hedgeyExecutorBalance).to.be.eq('1');
    expect(hedgeyInitiatorBalance).to.be.eq('1');
  });

  it('should execute a swap with a date in the past', async () => {
    await snapshot.restore();
    const expectedAmount = ethers.utils.parseEther('1');
    const unlockDate = moment().add(-1, 'day').unix();
    const swapId = await initSwap(unlockDate);
    const amountB = ethers.utils.parseEther('1');
    await tokenB.transfer(executorAddress, amountB);
    await tokenB.connect(executor).approve(hedgeyDAOSwap.address, amountB);
    const executeSwapTransaction = await hedgeyDAOSwap.connect(executor).executeSwap(swapId);
    const receipt = await executeSwapTransaction.wait();
    const event = receipt.events.find((event: any) => event.event === 'SwapExecuted');
    expect(event.args.id).to.be.eq(swapId);
    const executorBalance = await tokenA.balanceOf(executorAddress);
    const initiatorBalance = await tokenB.balanceOf(initiatorAddress);
    expect(executorBalance).to.be.eq(expectedAmount);
    expect(initiatorBalance).to.be.eq(expectedAmount);
  });

  it('should fail when an address other than the executor tries to execute the swap', async () => {
    await snapshot.restore();
    const unlockDate = moment().add(1, 'day').unix();
    const swapId = await initSwap(unlockDate);
    await expect(hedgeyDAOSwap.executeSwap(swapId)).to.be.revertedWith('only executor');
  });
});
