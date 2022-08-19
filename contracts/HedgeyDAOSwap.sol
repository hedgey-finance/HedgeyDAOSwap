// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.13;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import './libraries/TransferHelper.sol';
import './libraries/NFTHelper.sol';

/**
 * @title This contract allows a locked or unlocked DAO to DAO swap
 */
contract HedgeyDAOSwap is ReentrancyGuard {
  uint256 public swapId;

  struct Swap {
    address tokenA;
    address tokenB;
    uint256 amountA;
    uint256 amountB;
    uint256 unlockDate;
    address initiator;
    address executor;
    address nftLocker;
  }

  mapping(uint256 => Swap) public swaps;

  event NewSwap(
    uint256 indexed id,
    address tokenA,
    address tokenB,
    uint256 amountA,
    uint256 amountB,
    uint256 unlockDate,
    address indexed initiator,
    address indexed executor,
    address nftLocker
  );
  event SwapExecuted(uint256 indexed id);
  event SwapCancelled(uint256 indexed id);

  /**
   * Creates a new swap instance
   * @param tokenA The token from the swap initiator
   * @param tokenB The token expected from the executor
   * @param amountA The amount of tokenA tokens
   * @param amountB The amount of tokenB tokens
   * @param unlockDate The date on which this swap will unlock
   * @param executor The address that can execute this swap
   * @param nftLocker The address of the Hedgey NFT contract
   */
  function initSwap(
    address tokenA,
    address tokenB,
    uint256 amountA,
    uint256 amountB,
    uint256 unlockDate,
    address executor,
    address nftLocker
  ) external nonReentrant {
    TransferHelper.transferTokens(tokenA, msg.sender, address(this), amountA);
    swaps[swapId++] = Swap(tokenA, tokenB, amountA, amountB, unlockDate, msg.sender, executor, nftLocker);
    emit NewSwap(swapId, tokenA, tokenB, amountA, amountB, unlockDate, msg.sender, executor, nftLocker);
  }

  /**
   * Executes an existing swap
   * @param id The ID of the swap to execute
   * @notice Can only be executed by the executor address
   */
  function executeSwap(uint256 id) external nonReentrant {
    Swap memory swap = swaps[id];
    require(msg.sender == swap.executor, "Swap executor not authorized");
    delete swaps[id];
    if (swap.unlockDate > block.timestamp) {
      TransferHelper.transferTokens(swap.tokenB, swap.executor, address(this), swap.amountB);
      NFTHelper.lockTokens(swap.nftLocker, swap.initiator, swap.tokenB, swap.amountB, swap.unlockDate);
      NFTHelper.lockTokens(swap.nftLocker, swap.executor, swap.tokenA, swap.amountA, swap.unlockDate);
    } else {
      TransferHelper.transferTokens(swap.tokenB, swap.executor, swap.initiator, swap.amountB);
      TransferHelper.withdrawTokens(swap.tokenA, swap.executor, swap.amountA);
    }
    emit SwapExecuted(id);
  }

  /**
   * Cancels a swap that was previously setup
   * @param id The ID of the swap to cancel
   * @notice Can only be cancelled by the initiator address
   */
  function cancelSwap(uint256 id) external nonReentrant {
    Swap memory swap = swaps[id];
    require(msg.sender == swap.initiator, "Swap initiator not authorized");
    delete swaps[id];
    emit SwapCancelled(id);
    TransferHelper.withdrawTokens(swap.tokenA, swap.initiator, swap.amountA);
  }

  /**
   * View swap details
   * @param id The ID of the swap to query
   */
  function getSwapDetails(uint256 id)
    external
    view
    returns (
      address tokenA,
      address tokenB,
      uint256 amountA,
      uint256 amountB,
      uint256 unlockDate,
      address initiator,
      address executor,
      address nftLocker
    )
  {
    Swap memory swap = swaps[id];
    require(swap.initiator != address(0), "Swap does not exist");
    tokenA = swap.tokenA;
    tokenB = swap.tokenB;
    amountA = swap.amountA;
    amountB = swap.amountB;
    unlockDate = swap.unlockDate;
    initiator = swap.initiator;
    executor = swap.executor;
    nftLocker = swap.nftLocker;
  }
}
