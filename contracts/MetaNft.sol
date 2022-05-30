//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MetaNft is ERC721 {
    /////////////////////
    // LIBRARY AUG
    /////////////////////
    using ECDSA for bytes32;

    /////////////////////
    // STORAGE
    /////////////////////
    uint256 private _tokenId;
    mapping(bytes32 => bool) private _nonceMap;

    /////////////////////
    // FUNCTIONS
    /////////////////////
    /**
    @notice Constructor
     */
    constructor() ERC721("MetaNFT", "MFT") {
        _tokenId += 1;
    }

    /**
    @notice Allows anyone to freely mint themselves an NFT (for demonstration of this POC)
     */
    function mintFree() external {
        _mint(msg.sender, _tokenId);
        _tokenId += 1;
    }

    /**
    @notice Allows NFT owners to transfer their tokens to anyone, WITHOUT calling `approve` or `transfer` themselves
    @param _nonce A nonce value to be used; must be unique per _owner
    @param _owner Owner of the NFT to be transferred
    @param _recipient Recipient to send NFT to
    @param _tokenIdToTransfer Token ID of the NFT to transfer
    @param _signature Signature needed to verify transaction; sign(keccak256(_nonce + _owner + _recipient + ))_tokenIdToTransfer
    @dev This function can be called by anyone to go ahead with the transfer, provided they have the one-time xsignature from _owner.
     */
    function transferMeta(
        uint256 _nonce,
        address _owner,
        address _recipient,
        uint256 _tokenIdToTransfer,
        bytes calldata _signature // sign(keccak256(_nonce + _owner + _recipient + _tokenIdToTransfer))
    ) external {
        // Get hash of input
        bytes32 hash = keccak256(
            abi.encodePacked(_nonce, _owner, _recipient, _tokenIdToTransfer)
        );

        // Verify if nonce has not been used before
        require(!_nonceMap[hash], "USED NONCE");

        // Verify if the NFT owner is the one trying to put this for sale
        bytes32 hashFormatted = hash.toEthSignedMessageHash();
        address sender = hashFormatted.recover(_signature);
        require(sender == _owner, "NOT SIGNED BY OWNER");

        // Update nonce map
        _nonceMap[hash] = true;

        // Go ahead with transfer if above verification succeeded
        _safeTransfer(_owner, _recipient, _tokenIdToTransfer, "");
    }
}
