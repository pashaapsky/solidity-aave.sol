require("@nomiclabs/hardhat-waffle");
require('hardhat-deploy');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const ALCHEMY_MAINNET_FORK_API_URL =
    "https://eth-mainnet.alchemyapi.io/v2/gIuOz3g7EgE5HwC6HrPlHDkwd0dsK7T_";
const INFURA_KOVAN_API_URL = "https://kovan.infura.io/v3/837b6d197c4f482989309f5946cedaa4";

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
      },
      {
        version: "0.6.12",
      }
    ],
  },
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: ALCHEMY_MAINNET_FORK_API_URL,
        // blockNumber: 11095000
      },
      wethToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      daiToken: "0x6b175474e89094c44da98b954eedeac495271d0f",
      lendingPoolAddressesProvider: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
      daiToEthPriceFeed: "0x773616E4d11A78F511299002da57A0a94577F1f4",
    },
    kovan: {
      url: INFURA_KOVAN_API_URL,
      accounts: [process.env.META_MASK_AC1_KEY, process.env.META_MASK_AC2_KEY],
      wethToken: "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
      daiToken: "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD",
      lendingPoolAddressesProvider: "0x88757f2f99175387aB4C6a4b3067c77A695b0349",
      daiToEthPriceFeed: "0x22B58f1EbEDfCA50feF632bD73368b2FdA96D541",
    },
  },
  mocha: {
    timeout: 1000000,
  },
  etherscan: {
    apiKey: process.env.ETHER_SCAN_API_KEY,
  },
};
