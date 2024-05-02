const { artifacts, ethers } = require('hardhat');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  // deploy contracts here:
  const NFT = await ethers.getContractFactory('NFT');
  const nft = await NFT.deploy();
  console.log('NFT contract deployed to: ', nft.address);

  const Marketplace = await ethers.getContractFactory('Marketplace');
  const feeMarketplacePercent = 1;
  const feeCollectionOwnerPercent = 1;
  const feeRoyaltiesPercent = 1;
  const marketplace = await Marketplace.deploy(
    nft.address,
    feeMarketplacePercent,
    feeCollectionOwnerPercent,
    feeRoyaltiesPercent
  );
  console.log('Marketplace contract deployed to: ', marketplace.address);

  // For each contract, pass the deployed contract and name to this function to save a copy of the contract ABI and address to the front end.
  saveFrontendFiles(nft, 'NFT');
  saveFrontendFiles(marketplace, 'Marketplace');
}

function saveFrontendFiles(contract, name) {
  const fs = require('fs');
  const contractsDir = path.join(__dirname, '/../../frontend/contractsData');

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(contractsDir + `/${name}-address.json`, JSON.stringify({ address: contract.address }, undefined, 2));

  const contractArtifact = artifacts.readArtifactSync(name);

  fs.writeFileSync(contractsDir + `/${name}.json`, JSON.stringify(contractArtifact, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
