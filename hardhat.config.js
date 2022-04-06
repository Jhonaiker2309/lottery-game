require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
	networks: {
		hardhat: {
			forking: {
				url: process.env.ALCHEMY_KEY,
				blockNumber: 14521925,
			},
			chainId: 31337,
		},
		mainnet: {
			url: process.env.ALCHEMY_KEY,
			accounts: [process.env.ACCOUNT_KEY],
		},
		live: {
			url: process.env.ALCHEMY_KEY,
			accounts: [process.env.ACCOUNT_KEY],
		},
	},
	namedAccounts: {
		deployer: 0,
		feeRecipient: 1,
		user: 2,
	},
	solidity: {
        compilers: [
          {version: "0.7.0"},
          {version: "0.8.6"},
          {version: "0.8.0"}
        ],
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	mocha: {
		timeout: 240000,
	},
};