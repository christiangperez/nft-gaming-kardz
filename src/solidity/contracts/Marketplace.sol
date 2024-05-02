// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import './NFT.sol';

contract Marketplace is ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    struct Item {
        uint256 tokenId;
        uint256 collectionId;
        IERC721 nft;
        uint256 price;
        uint256 latestPrice;
        address payable seller;
        bool onSale;
    }

    address contractOwner;

    address private immutable _nftContractAddress;
    address payable public immutable feeMarketplaceAccount; // the account that receives fees
    uint256 public feeMarketplacePercent; // the fee percentage on sales
    uint256 public immutable feeCollectionPercent; // the fee collection percentage on sales
    uint256 public feeRoyaltiesPercent; // the fee royalties percentage on sales

    Counters.Counter public collectionCount;

    mapping(uint256 => Item) public items;

    uint256 public tokenCount;

    // Balance of all accounts
    mapping(address => uint256) private _accountsBalance;

    // Token ID to collection owner
    mapping(uint256 => address) private _collectionOwners;

    // Collection Owner to Earn Percentage for sales
    mapping(address => uint256) private _collectionOwnersEarnPercentage;

    // Token ID to owner address to pay royalties
    mapping(uint256 => address) private _royaltiesBeneficiaries;

    modifier onlyOwner() {
        require(msg.sender == contractOwner, 'You are not the owner');
        _;
    }

    event Offered(uint256 tokenId, address indexed nft, uint256 price, address indexed seller);

    event Bought(
        uint256 indexed tokenId,
        address nft,
        uint256 price,
        uint256 totalPrice,
        address indexed seller,
        address indexed buyer
    );

    event ItemOnSale(uint256 itemId, uint256 tokenId, uint256 price, address indexed seller);

    constructor(
        address nftContractAddress,
        uint256 _feeMarketplacePercent,
        uint256 _feeCollectionPercent,
        uint256 _feeRoyaltiesPercent
    ) {
        contractOwner = msg.sender;

        _nftContractAddress = nftContractAddress;

        feeMarketplaceAccount = payable(msg.sender);
        feeMarketplacePercent = _feeMarketplacePercent;
        feeCollectionPercent = _feeCollectionPercent;
        feeRoyaltiesPercent = _feeRoyaltiesPercent;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    struct CollectionData {
        string tokenURI;
        uint256 price;
    }

    function mintCollection(
        CollectionData[] memory collectionData,
        address payable collectionOwner,
        uint256 percentageEarnCollection
    ) external nonReentrant onlyOwner {
        require(collectionData.length > 0, 'tokenUris and prices needed');
        require(
            percentageEarnCollection >= 0 && percentageEarnCollection <= 100,
            'Percentage Earn Collection must be 0 to 100'
        );

        collectionCount.increment();

        for (uint256 i = 0; i < collectionData.length; i++) {
            require(bytes(collectionData[i].tokenURI).length > 0, 'Token URI must not be empty');
            require(collectionData[i].price > 0, 'Price must be greater than zero');
            tokenCount = NFT(_nftContractAddress).mint(msg.sender, collectionData[i].tokenURI);

            if (collectionOwner != address(0)) {
                setCollectionOwner(tokenCount, collectionOwner);
                if (percentageEarnCollection > 0) {
                    _collectionOwnersEarnPercentage[collectionOwner] = percentageEarnCollection;
                }
            }

            items[tokenCount] = Item({
                tokenId: tokenCount,
                collectionId: collectionCount.current(),
                nft: IERC721(_nftContractAddress),
                price: collectionData[i].price,
                latestPrice: 0,
                seller: payable(address(this)),
                onSale: true
            });

            ERC721(_nftContractAddress).transferFrom(msg.sender, address(this), tokenCount);

            emit Offered({
                tokenId: tokenCount,
                nft: _nftContractAddress,
                price: collectionData[i].price,
                seller: contractOwner
            });
        }
    }

    function purchaseToken(uint256 tokenId) external payable nonReentrant whenNotPaused {
        require(tokenId > 0 && tokenId <= NFT(_nftContractAddress).tokenCount(), "item doesn't exists");
        require(msg.value >= getTotalPrice(tokenId), 'not enogh ether to cover item price and market fees');
        require(items[tokenId].onSale, 'Token is not on sale');
        Item memory item = items[tokenId];

        uint256 pricePurchased = getTotalPrice(tokenId);

        _accountsBalance[feeMarketplaceAccount] += getTotalFeeMarketplace(tokenId);

        items[tokenId].latestPrice = getTotalPrice(tokenId);

        uint256 totalFeeCollection = getTotalFeeCollection(tokenId);
        address collectionOwner = _collectionOwners[item.tokenId];
        if (totalFeeCollection > 0 && collectionOwner != address(0) && items[tokenId].seller != address(this)) {
            _accountsBalance[collectionOwner] += getTotalFeeCollection(tokenId);
        }

        address royaltyBeneficiary = _royaltiesBeneficiaries[item.tokenId];
        uint256 totalFeeRoyalties = getTotalFeeRoyalties(tokenId);
        // if beneficiary is empty, set sender to royalties beneficiary
        if (royaltyBeneficiary == address(0)) {
            setRoyaltiesBeneficiary(item.tokenId, msg.sender);
        } else if (totalFeeRoyalties > 0) {
            // pay royalties to royalty beneficiary
            _accountsBalance[royaltyBeneficiary] += totalFeeRoyalties;
        }

        items[tokenId].seller = payable(msg.sender);
        items[tokenId].onSale = false;

        uint256 marketplaceAmount = item.price;
        if (item.seller == address(this)) {
            uint256 collectionOwnerEarnPercentage = _collectionOwnersEarnPercentage[collectionOwner];
            if (collectionOwnerEarnPercentage > 0) {
                // pay to collection owner
                uint256 collectionOwnerAmount = ((item.price * (100 + collectionOwnerEarnPercentage)) / 100) -
                    item.price;
                _accountsBalance[collectionOwner] += collectionOwnerAmount;

                marketplaceAmount -= collectionOwnerAmount;
            }
        }
        // pay to seller
        _accountsBalance[item.seller] += marketplaceAmount;

        // transfer nft to buyer
        ERC721(_nftContractAddress).transferFrom(item.seller, msg.sender, item.tokenId);

        emit Bought({
            tokenId: tokenId,
            nft: _nftContractAddress,
            price: item.price,
            totalPrice: pricePurchased,
            seller: item.seller,
            buyer: msg.sender
        });
    }

    function claimEarns() public {
        uint256 amount = _accountsBalance[msg.sender];
        require(amount > 0, 'You do not have founds');

        _accountsBalance[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function setItemOnSale(uint256 tokenId, uint256 price) external nonReentrant whenNotPaused {
        require(items[tokenId].seller == msg.sender, "you can't set on sale items of another owners");
        require(price > 0, 'Price must be greater than zero');
        items[tokenId].price = price;
        items[tokenId].onSale = true;

        emit ItemOnSale({
            itemId: tokenId,
            tokenId: items[tokenId].tokenId,
            price: items[tokenId].price,
            seller: msg.sender
        });
    }

    function getTotalPrice(uint256 tokenId) public view returns (uint256) {
        uint256 feeMarketPlace = getTotalFeeMarketplace(tokenId);
        uint256 feeCollection = getTotalFeeCollection(tokenId);
        uint256 feeRoyalties = getTotalFeeRoyalties(tokenId);

        if (items[tokenId].seller == address(this)) {
            return items[tokenId].price;
        } else {
            return items[tokenId].price + feeMarketPlace + feeCollection + feeRoyalties;
        }
    }

    function getTotalFeeMarketplace(uint256 tokenId) public view returns (uint256) {
        uint256 feeAccountAmount = 0;
        if (feeMarketplaceAccount != address(0)) {
            feeAccountAmount = ((items[tokenId].price * (100 + feeMarketplacePercent)) / 100) - items[tokenId].price;
        }

        return feeAccountAmount;
    }

    function getTotalFeeCollection(uint256 tokenId) public view returns (uint256) {
        uint256 feeCollection = 0;
        address collectionOwner = _collectionOwners[tokenId];
        if (collectionOwner != address(0) && items[tokenId].seller != address(this)) {
            feeCollection = ((items[tokenId].price * (100 + feeCollectionPercent)) / 100) - items[tokenId].price;
        }

        return feeCollection;
    }

    function getTotalFeeRoyalties(uint256 tokenId) public view returns (uint256) {
        uint256 feeRoyalties = 0;
        address royaltiesBeneficiary = _royaltiesBeneficiaries[tokenId];
        if (royaltiesBeneficiary != address(0)) {
            feeRoyalties = ((items[tokenId].price * (100 + feeRoyaltiesPercent)) / 100) - items[tokenId].price;
        }

        return feeRoyalties;
    }

    function getAccountsBalance(address _address) public view returns (uint256) {
        require(_address == msg.sender, 'You can not access someone else balance');
        return _accountsBalance[_address];
    }

    function changeFeePercent(uint256 feePercent) public onlyOwner {
        require(feePercent > 0, 'Fee percent must be greater than 0');
        feeMarketplacePercent = feePercent;
    }

    function changeFeeRoyaltiesPercent(uint256 _feeRoyaltiesPercent) public onlyOwner {
        require(_feeRoyaltiesPercent > 0, 'Fee Royaltie percent must be greater than 0');
        feeRoyaltiesPercent = _feeRoyaltiesPercent;
    }

    function setRoyaltiesBeneficiary(uint256 tokenId, address to) internal virtual {
        require(_royaltiesBeneficiaries[tokenId] == address(0), 'Token already has a royalties owner');
        _royaltiesBeneficiaries[tokenId] = to;
    }

    function setCollectionOwner(uint256 tokenId, address collectionOwner) internal virtual {
        require(_royaltiesBeneficiaries[tokenId] == address(0), 'Token already has a collection owner');
        _collectionOwners[tokenId] = collectionOwner;
    }

    function getContractOwner() public view returns (address) {
        return contractOwner;
    }
}
