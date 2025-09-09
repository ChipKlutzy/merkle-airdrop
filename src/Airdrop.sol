// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Airdrop is Ownable {
    IERC20 public immutable token;
    bytes32 public merkleRoot;
    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed account, uint256 amount);

    constructor(address _token, bytes32 _merkleRoot) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
    }

    function claim(uint256 amount, bytes32[] calldata merkleProof) external {
        require(!hasClaimed[msg.sender], "Already claimed");

        bytes32 node = keccak256(abi.encodePacked(msg.sender, amount));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, node),
            "Invalid proof"
        );

        hasClaimed[msg.sender] = true;
        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit Claimed(msg.sender, amount);
    }
}
