import { expect } from 'chai';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import moment from 'moment';

const initialSupply = ethers.utils.parseEther('1000');

describe('HedgeyDAOSwap contract init swap', () => {
  let hedgeyDAOSwap: Contract;
  let tokenA: Contract;
  let tokenB: Contract;
  let zeroAddress: String;
  let hedgeys: Contract;

  let initiator: Signer;
  let initiatorAddress: String;

  let executor: Signer;
  let executorAddress: string;

  before(async () => {
    const Token = await ethers.getContractFactory('Token');
    const Weth = await ethers.getContractFactory('WETH9');
    const Hedgeys = await ethers.getContractFactory('Hedgeys');

    tokenA = await Token.deploy(initialSupply, 'TokenA', 'TKNA');
    tokenB = await Token.deploy(initialSupply, 'TokenB', 'TKNB');
    zeroAddress = '0x0000000000000000000000000000000000000000';
    const weth = await Weth.deploy();
    hedgeys = await Hedgeys.deploy(weth.address, '');

    const HedgeyDAOSwap = await ethers.getContractFactory('HedgeyDAOSwap');
    hedgeyDAOSwap = await HedgeyDAOSwap.deploy();

    const accounts = await ethers.getSigners();

    initiator = accounts[3];
    initiatorAddress = await initiator.getAddress();

    executor = accounts[4];
    executorAddress = await executor.getAddress();
  });

  it('should initialize a swap', async () => {
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

    expect(event.args.tokenA).to.be.eq(tokenA.address);
    expect(event.args.tokenB).to.be.eq(tokenB.address);
    expect(event.args.amountA).to.be.eq(amountA);
    expect(event.args.amountB).to.be.eq(amountB);
    expect(event.args.unlockDate).to.be.eq(unlockDate);
    expect(event.args.initiator).to.be.eq(initiatorAddress);
    expect(event.args.executor).to.be.eq(executorAddress);
    expect(event.args.nftLocker).to.be.eq(hedgeys.address);

    const contractBalance = await tokenA.balanceOf(hedgeyDAOSwap.address);
    expect(contractBalance).to.be.eq(amountA);
  });
  it('should fail if the initiator does not have sufficient balances', async () => {
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();

    await expect(
      hedgeyDAOSwap
        .connect(initiator)
        .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, executorAddress, hedgeys.address)
    ).to.be.revertedWith('THL01');
  });
  it('should fail if the initiator did not approve the token transfer', async () => {
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();
    await tokenA.transfer(initiatorAddress, amountA);

    await expect(
      hedgeyDAOSwap
        .connect(initiator)
        .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, executorAddress, hedgeys.address)
    ).to.be.revertedWith('ERC20: insufficient allowance');
  });
  it('should fail if the address of executor is zero address', async () => {
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();
    tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);

    await expect(
      hedgeyDAOSwap
        .connect(initiator)
        .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, zeroAddress, hedgeys.address)
    ).to.be.revertedWith('executor cannot be zero address');
  });
  it('should fail if the address of tokenA is zero address', async () => {
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();
    tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);

    await expect(
      hedgeyDAOSwap
        .connect(initiator)
        .initSwap(zeroAddress, tokenB.address, amountA, amountB, unlockDate, executorAddress, hedgeys.address)
    ).to.be.revertedWith('token address issue');
  });
  it('should fail if the address of tokenA is zero address', async () => {
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();
    tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);

    await expect(
      hedgeyDAOSwap
        .connect(initiator)
        .initSwap(tokenA.address, zeroAddress, amountA, amountB, unlockDate, executorAddress, hedgeys.address)
    ).to.be.revertedWith('token address issue');
  });
  it('should fail if the unlock date is in the future and the nftLocker is zero address', async () => {
    const amountA = ethers.utils.parseEther('1');
    const amountB = ethers.utils.parseEther('1');
    const unlockDate = moment().add(1, 'day').unix();
    tokenA.connect(initiator).approve(hedgeyDAOSwap.address, amountA);

    await expect(
      hedgeyDAOSwap
        .connect(initiator)
        .initSwap(tokenA.address, tokenB.address, amountA, amountB, unlockDate, executorAddress, zeroAddress)
    ).to.be.revertedWith('nft locker cannot be zero');
  });
});
