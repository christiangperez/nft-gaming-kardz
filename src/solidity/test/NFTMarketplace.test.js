const { expect } = require('chai');
const { ethers, waffle } = require('hardhat');

const toWei = (num) => ethers.utils.parseEther(num.toString());
const fromWei = (num) => ethers.utils.formatEther(num);

const URI_1 = 'http://ipfs.io/asdf1';
const URI_2 = 'http://ipfs.io/asdf2';

describe('NFTMarketplace', () => {
  let deployer, addr1, addr2, addr3, addr4, nft, marketplace;
  const feeMarketplacePercent = 1;
  const feeCollectionPercent = 1;
  const collectionOwnerEarnPercent = 50;
  const feeRoyaltiesPercent = 1;

  beforeEach(async () => {
    const NFT = await ethers.getContractFactory('NFT');
    const Marketplace = await ethers.getContractFactory('Marketplace');

    [deployer, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    nft = await NFT.deploy();
    marketplace = await Marketplace.deploy(
      nft.address,
      feeMarketplacePercent,
      feeCollectionPercent,
      feeRoyaltiesPercent
    );
  });

  describe('Deployment', () => {
    it('should track feeAccount and feeMarketplacePercent', async () => {
      expect(await marketplace.feeMarketplaceAccount()).equal(deployer.address);
      expect(await marketplace.feeMarketplacePercent()).equal(feeMarketplacePercent);
    });

    it('should track feeRoyaltiesPercent of the marketplace', async () => {
      expect(await marketplace.feeRoyaltiesPercent()).equal(feeRoyaltiesPercent);
    });

    it('should change the fee percent of marketplace and fee percent of royalties', async () => {
      const newFeePercent = 2;
      const newFeePercentRoyalties = 2;

      marketplace.connect(deployer).changeFeePercent(newFeePercent);
      marketplace.connect(deployer).changeFeeRoyaltiesPercent(newFeePercentRoyalties);

      expect(await marketplace.feeMarketplacePercent()).equal(newFeePercent);
      expect(await marketplace.feeRoyaltiesPercent()).equal(newFeePercentRoyalties);
    });
  });

  describe('Minting NFT collections', () => {
    it('should track each minted NFT Collection and emit Offered event', async () => {
      const tokenPrice = toWei(1);

      await nft.connect(deployer).setApprovalForAll(marketplace.address, true);

      // DEPLOY COLLECTION WITH 1 NFT
      await expect(
        marketplace.connect(deployer).mintCollection(
          [
            {
              tokenURI: URI_1,
              price: tokenPrice
            }
          ],
          addr1.address,
          collectionOwnerEarnPercent
        )
      )
        .emit(marketplace, 'Offered')
        .withArgs(1, nft.address, tokenPrice, deployer.address);

      expect(await nft.tokenCount()).equal(1);
      expect(await nft.balanceOf(marketplace.address)).equal(1);
      expect(await nft.tokenURI(1)).equal(URI_1);

      const secondTokenPrice1 = toWei(1);
      const secondTokenPrice2 = toWei(2);

      // DEPLOY COLLECTION WITH 2 NFTS
      await expect(
        marketplace.connect(deployer).mintCollection(
          [
            {
              tokenURI: URI_1,
              price: secondTokenPrice1
            },
            {
              tokenURI: URI_2,
              price: secondTokenPrice2
            }
          ],
          addr1.address,
          collectionOwnerEarnPercent
        )
      )
        .emit(marketplace, 'Offered')
        .withArgs(2, nft.address, secondTokenPrice1, deployer.address)
        .withArgs(3, nft.address, secondTokenPrice2, deployer.address);

      expect(await nft.tokenCount()).equal(3);
      expect(await nft.balanceOf(marketplace.address)).equal(3);
      expect(await nft.tokenURI(2)).equal(URI_1);
      expect(await nft.tokenURI(3)).equal(URI_2);
    });
  });

  describe('Purchasing recently minted items', () => {
    let totalPriceInWei;

    it('should receive payment from buyer (marketplace and collection owner), transfer NFT to buyer, charge fees and emit a Bought event', async () => {
      const provider = waffle.provider;
      const tokenPrice = toWei(1);

      await nft.connect(deployer).setApprovalForAll(marketplace.address, true);

      // DEPLOY COLLECTION WITH 1 NFT
      await marketplace.connect(deployer).mintCollection(
        [
          {
            tokenURI: URI_1,
            price: tokenPrice
          }
        ],
        addr1.address,
        collectionOwnerEarnPercent
      );

      // fetch items total price (market fees + item price)
      totalPriceInWei = await marketplace.getTotalPrice(1);

      await nft.connect(deployer).setApprovalForAll(marketplace.address, true);

      // addr2 purchases item
      await expect(marketplace.connect(addr2).purchaseToken(1, { value: totalPriceInWei }))
        .emit(marketplace, 'Bought')
        .withArgs(1, nft.address, tokenPrice, totalPriceInWei, marketplace.address, addr2.address);

      expect(await nft.ownerOf(1)).equal(addr2.address);

      const balance = await provider.getBalance(marketplace.address);
      expect(balance).equal(totalPriceInWei);

      const balanceMarketplace = await marketplace.connect(marketplace.address).getAccountsBalance(marketplace.address);
      expect(balanceMarketplace).equal(toWei(0.5));

      const balanceCollectionOwner = await marketplace.connect(addr1.address).getAccountsBalance(addr1.address);
      expect(balanceCollectionOwner).equal(toWei(0.5));

      const balanceOwnerMarketplace = await marketplace.connect(deployer.address).getAccountsBalance(deployer.address);
      const feeAccount = await marketplace.getTotalFeeMarketplace(1);
      expect(balanceOwnerMarketplace).equal(feeAccount);
    });
  });

  describe('Purchasing marketplace items', () => {
    it('should buy a NFT, set to sale, emit ItemOnSale event, sell the NFT and every fee should sent to respective owners and claim earns', async () => {
      const provider = waffle.provider;
      const tokenPrice = toWei(1);

      await nft.connect(deployer).setApprovalForAll(marketplace.address, true);

      // DEPLOY COLLECTION WITH 1 NFT
      await marketplace.connect(deployer).mintCollection(
        [
          {
            tokenURI: URI_1,
            price: tokenPrice
          }
        ],
        addr1.address,
        collectionOwnerEarnPercent
      );

      const totalPriceInWei = await marketplace.getTotalPrice(1);
      const feeMarketplace = await marketplace.getTotalFeeMarketplace(1);
      const feeCollection = await marketplace.getTotalFeeCollection(1);
      const collectionOwnerEarn = (tokenPrice * collectionOwnerEarnPercent) / 100;

      // addr2 purchase item
      await nft.connect(addr2).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(addr2).purchaseToken(1, { value: totalPriceInWei });

      // addr2 set item to sale to 2 ETH
      const tokenPriceAddr2 = toWei(2);
      await expect(await marketplace.connect(addr2).setItemOnSale(1, tokenPriceAddr2))
        .emit(marketplace, 'ItemOnSale')
        .withArgs(1, 1, tokenPriceAddr2, addr2.address);

      const secondTotalPriceInWei = await marketplace.getTotalPrice(1);
      const secondFeeMarketplace = await marketplace.getTotalFeeMarketplace(1);
      const secondFeeCollection = await marketplace.getTotalFeeCollection(1);
      const feeRoyalties = await marketplace.getTotalFeeRoyalties(1);

      // addr3 purchase item on sale by addr2
      await nft.connect(addr3).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(addr3).purchaseToken(1, { value: secondTotalPriceInWei });

      // addr3 set item on sale to 3 ETH
      const tokenPriceAddr3 = toWei(3);
      await expect(await marketplace.connect(addr3).setItemOnSale(1, tokenPriceAddr3))
        .emit(marketplace, 'ItemOnSale')
        .withArgs(1, 1, tokenPriceAddr3, addr3.address);

      const thirdTotalPriceInWei = await marketplace.getTotalPrice(1);
      const thirdFeeMarketplace = await marketplace.getTotalFeeMarketplace(1);
      const thirdFeeCollection = await marketplace.getTotalFeeCollection(1);
      const secondFeeRoyalties = await marketplace.getTotalFeeRoyalties(1);

      // addr4 purchase item on sale by addr3
      await nft.connect(addr4).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(addr4).purchaseToken(1, { value: thirdTotalPriceInWei });

      const balance = await provider.getBalance(marketplace.address);
      const sumPrices = +fromWei(totalPriceInWei) + +fromWei(secondTotalPriceInWei) + +fromWei(thirdTotalPriceInWei);
      expect(balance).equal(toWei(sumPrices));

      const balanceAddr2 = await marketplace.connect(addr2.address).getAccountsBalance(addr2.address);
      expect(+fromWei(balanceAddr2)).equal(
        +fromWei(tokenPriceAddr2) + +fromWei(feeRoyalties) + +fromWei(secondFeeRoyalties)
      );

      const balanceAddr3 = await marketplace.connect(addr3.address).getAccountsBalance(addr3.address);
      expect(balanceAddr3).equal(tokenPriceAddr3);

      const balanceAddr4 = await marketplace.connect(addr4.address).getAccountsBalance(addr4.address);
      expect(balanceAddr4).equal(0);

      const balanceOwnerMarketplace = await marketplace.connect(deployer.address).getAccountsBalance(deployer.address);
      expect(+fromWei(balanceOwnerMarketplace)).equal(
        +fromWei(feeMarketplace) + +fromWei(secondFeeMarketplace) + +fromWei(thirdFeeMarketplace)
      );

      const balanceOwnerCollection = await marketplace.connect(addr1.address).getAccountsBalance(addr1.address);
      expect(+fromWei(balanceOwnerCollection)).equal(
        +fromWei(feeCollection) +
          +fromWei(secondFeeCollection) +
          +fromWei(thirdFeeCollection) +
          +fromWei(collectionOwnerEarn.toString())
      );

      const balanceMarketplace = await marketplace.connect(marketplace.address).getAccountsBalance(marketplace.address);
      expect(+fromWei(balanceMarketplace)).equal(
        +fromWei(tokenPrice.toString()) - +fromWei(collectionOwnerEarn.toString())
      );

      // CLAIM
      const balanceAddr3PreClaim = await provider.getBalance(addr3.address);
      await marketplace.connect(addr3).claimEarns();
      const balanceAddr3PostClaim = await provider.getBalance(addr3.address);
      expect(+balanceAddr3PostClaim).greaterThan(+balanceAddr3PreClaim);
    });

    it('should fail for invalid item ids and when not enough ether is paid', async () => {
      const tokenPrice = toWei(1);

      await nft.connect(deployer).setApprovalForAll(marketplace.address, true);

      // DEPLOY COLLECTION WITH 1 NFT
      await marketplace.connect(deployer).mintCollection(
        [
          {
            tokenURI: URI_1,
            price: tokenPrice
          }
        ],
        addr1.address,
        collectionOwnerEarnPercent
      );

      await nft.connect(addr4).setApprovalForAll(marketplace.address, true);

      const totalPriceInWei = toWei(1);

      // fails for invalid item ids
      await expect(marketplace.connect(addr4).purchaseToken(20, { value: totalPriceInWei })).revertedWith(
        "item doesn't exists"
      );
      await expect(marketplace.connect(addr4).purchaseToken(0, { value: totalPriceInWei })).revertedWith(
        "item doesn't exists"
      );
      // Fails when not enough ether is paid with the transaction.
      await expect(marketplace.connect(addr4).purchaseToken(1, { value: toWei(0.1) })).revertedWith(
        'not enogh ether to cover item price and market fees'
      );
    });
  });
});
