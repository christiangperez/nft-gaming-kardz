const { expect } = require('chai');
const { ethers } = require('hardhat');

const URI_1 = 'http://ipfs.io/asdf1';
const URI_2 = 'http://ipfs.io/asdf2';

describe('NFT', () => {
  let deployer, nft, marketplace;
  const feePercent = 1;
  const feeCollectionPercent = 1;
  const feeRoyaltiesPercent = 1;

  beforeEach(async () => {
    const NFT = await ethers.getContractFactory('NFT');
    const Marketplace = await ethers.getContractFactory('Marketplace');

    [deployer] = await ethers.getSigners();

    nft = await NFT.deploy();
    marketplace = await Marketplace.deploy(nft.address, feePercent, feeCollectionPercent, feeRoyaltiesPercent);
  });

  describe('Deployment', () => {
    it('should track name and symbol of the nft collection', async () => {
      expect(await nft.name()).equal('Gaming Kardz NFT');
      expect(await nft.symbol()).equal('GKRDZ');
    });
  });

  describe('Minting NFT', () => {
    it('should create a new token', async () => {
      await nft.connect(deployer).setApprovalForAll(marketplace.address, true);

      // MINT
      await nft.connect(deployer).mint(deployer.address, URI_1);

      expect(await nft.tokenCount()).equal(1);
    });

    it('should increase balance correctly and return the correct URI', async () => {
      await nft.connect(deployer).setApprovalForAll(marketplace.address, true);

      // MINT
      await nft.connect(deployer).mint(deployer.address, URI_1);

      expect(await nft.balanceOf(deployer.address)).equal(1);

      await nft.connect(deployer).mint(deployer.address, URI_2);

      expect(await nft.tokenCount()).equal(2);
      expect(await nft.balanceOf(deployer.address)).equal(2);
      expect(await nft.tokenURI(1)).equal(URI_1);
      expect(await nft.tokenURI(2)).equal(URI_2);
    });
  });
});
