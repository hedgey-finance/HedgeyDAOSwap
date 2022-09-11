# Hedgey DAO swap

This contract allows a locked or unlocked DAO to DAO swap of each DAOs' tokens. Read further in the documentation for the full technical details of how to interact with and use the contract and functions. 


## Testing
Clone repository

``` bash
npm install
npx hardhat compile
npx hardhat test
```

## Deploymenting    
To deploy the contracts, as there is no constructor arguments required, you simply deploy the contract with hardhat or your preferred methods (ie nodeJS script, Remix IDE).  
Because there are no owners or admins of the contract, once deployed there are no possible modifications to global variables, only external functions will change the storage and state of the contract based on the core logic of the contract.   
This is a single standing contract, and though it does interact with other Hedgey contracts (namely the FuturesNFT.sol) for locking tokens, there is no maintenance requirements after deployment, and this is not related to a factory contract infrastructure. 
