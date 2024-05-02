require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
const { hardHatSettings } = require("./src/solidity/scripts/helpers.js");

module.exports = {
  solidity: '0.8.4',
  paths: {
    artifacts: './src/solidity/artifacts',
    sources: './src/solidity/contracts',
    cache: './src/solidity/cache',
    tests: './src/solidity/test'
  },
  networks: hardHatSettings.networks,
  defaultNetwork: "hardhat",
};
