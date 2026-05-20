require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',
  paths: {
    sources: './',
  },
  networks: {
    amoy: {
      url: process.env.POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology',
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
};
