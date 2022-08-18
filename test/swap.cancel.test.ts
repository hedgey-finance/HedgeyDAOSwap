import { expect } from 'chai';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import moment from 'moment';
import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

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

  let snapshot: SnapshotRestorer;

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

  it('should cancel a swap', async () => {
    await snapshot.restore();
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();

    await tokenA.transfer(initiatorAddress, amountA);
    tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);
    const swapTransation = await hedgeyDAOSwap
      .connect(initiator)
      .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, executorAddress, hedgeys.address);
    const receipt = await swapTransation.wait();
    const event = receipt.events.find((event: any) => event.event === 'NewSwap');
    const swapId = event.args.id;

    const cancelTransaction = await hedgeyDAOSwap.connect(initiator).cancelSwap(swapId);
    const cancelReceipt = await cancelTransaction.wait();
    const cancelEvent = cancelReceipt.events.find((event: any) => event.event === 'SwapCancelled');
    const cancelledSwapId = cancelEvent.args.id;
    expect(cancelledSwapId).to.be.eq(swapId);
  });

  it('should fail when not cancelled by the initiator', async () => {
    await snapshot.restore();
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();
    await tokenA.transfer(initiatorAddress, amountA);
    tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);
    const swapTransation = await hedgeyDAOSwap
      .connect(initiator)
      .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, executorAddress, hedgeys.address);
    const receipt = await swapTransation.wait();
    const event = receipt.events.find((event: any) => event.event === 'NewSwap');
    const swapId = event.args.id;
    await expect(hedgeyDAOSwap.cancelSwap(swapId)).to.be.revertedWith('Swap initiator not authorized');
  });
});
