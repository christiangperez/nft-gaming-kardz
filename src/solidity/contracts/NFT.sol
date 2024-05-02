// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

contract NFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter public tokenCount;
    address contractOwner;

    constructor() ERC721('Gaming Kardz NFT', 'GKRDZ') {
        contractOwner = msg.sender;
    }

    function mint(address _from, string memory _tokenURI) external returns (uint256) {
        require(_from == contractOwner, 'You are not the owner.');
        tokenCount.increment();
        uint256 newTokenId = tokenCount.current();
        // _tokenURIs[newTokenId] = _tokenURI;
        _safeMint(_from, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        return newTokenId;
    }
}
