import { ethers } from 'ethers';

export interface INFTItem {
  totalPrice: number;
  latestPrice: number;
  tokenId: number;
  name: string;
  team: string;
  game: string;
  description: string;
  image: string;
  seller: string;
  price: number;
  onSale: boolean;
}
export interface Nft {
  tokenURI: string;
  price: ethers.BigNumber;
}

export interface IJsonCollection {
  collectionOwner: string;
  ownerEarnsPercentagePerTransaction: number;
  nfts: Nft[];
}
