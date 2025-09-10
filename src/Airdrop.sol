// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Airdrop is Ownable {
    IERC20 public immutable token;
    bytes32 public merkleRoot;
    uint256 public claimStartTime;
    uint256 public claimEndTime;
    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 merkleRoot);
    event ClaimPeriodUpdated(uint256 startTime, uint256 endTime);

    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _claimStartTime,
        uint256 _claimEndTime
    ) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        require(_claimStartTime < _claimEndTime, "Invalid claim period");
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
        claimStartTime = _claimStartTime;
        claimEndTime = _claimEndTime;
    }

    function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    function updateClaimPeriod(
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner {
        require(_startTime < _endTime, "Invalid claim period");
        claimStartTime = _startTime;
        claimEndTime = _endTime;
        emit ClaimPeriodUpdated(_startTime, _endTime);
    }

    function claim(uint256 amount, bytes32[] calldata merkleProof) external {
        require(block.timestamp >= claimStartTime, "Claim not started");
        require(block.timestamp <= claimEndTime, "Claim ended");
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

    function batchClaim(
        address[] calldata accounts,
        uint256[] calldata amounts,
        bytes32[][] calldata merkleProofs
    ) external {
        require(block.timestamp >= claimStartTime, "Claim not started");
        require(block.timestamp <= claimEndTime, "Claim ended");
        require(
            accounts.length == amounts.length &&
                amounts.length == merkleProofs.length,
            "Invalid input"
        );

        for (uint256 i = 0; i < accounts.length; i++) {
            if (!hasClaimed[accounts[i]]) {
                bytes32 node = keccak256(
                    abi.encodePacked(accounts[i], amounts[i])
                );
                require(
                    MerkleProof.verify(merkleProofs[i], merkleRoot, node),
                    "Invalid proof"
                );

                hasClaimed[accounts[i]] = true;
                require(
                    token.transfer(accounts[i], amounts[i]),
                    "Transfer failed"
                );

                emit Claimed(accounts[i], amounts[i]);
            }
        }
    }
}
