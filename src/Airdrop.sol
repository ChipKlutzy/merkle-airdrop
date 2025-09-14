// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Airdrop is Ownable, Pausable, ReentrancyGuard {
    IERC20 public immutable token;
    bytes32 public merkleRoot;
    uint256 public claimStartTime;
    uint256 public claimEndTime;
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public claimedAmount;
    uint256 public totalClaimed;

    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 merkleRoot);
    event ClaimPeriodUpdated(uint256 startTime, uint256 endTime);
    event EmergencyWithdrawn(address indexed token, uint256 amount);

    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _claimStartTime,
        uint256 _claimEndTime
    ) Ownable(msg.sender) Pausable() ReentrancyGuard() {
        require(_token != address(0), "Invalid token address");
        require(_claimStartTime < _claimEndTime, "Invalid claim period");
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
        claimStartTime = _claimStartTime;
        claimEndTime = _claimEndTime;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
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

    function claim(
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant whenNotPaused {
        _claimInternal(msg.sender, amount, merkleProof);
    }

    function claimFor(
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant whenNotPaused {
        _claimInternal(account, amount, merkleProof);
    }

    function batchClaim(
        address[] calldata accounts,
        uint256[] calldata amounts,
        bytes32[][] calldata merkleProofs
    ) external nonReentrant whenNotPaused {
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
                claimedAmount[accounts[i]] = amounts[i];
                totalClaimed += amounts[i];
                require(
                    token.transfer(accounts[i], amounts[i]),
                    "Transfer failed"
                );

                emit Claimed(accounts[i], amounts[i]);
            }
        }
    }

    function emergencyWithdraw(address _token) external onlyOwner nonReentrant {
        if (_token == address(0)) {
            uint256 balance = address(this).balance;
            require(balance > 0, "Nothing to withdraw");

            (bool success, ) = owner().call{value: balance}("");
            require(success, "Transfer failed");

            emit EmergencyWithdrawn(_token, balance);
        } else {
            IERC20 erc20 = IERC20(_token);
            uint256 balance = erc20.balanceOf(address(this));
            require(balance > 0, "Nothing to withdraw");

            require(erc20.transfer(owner(), balance), "Transfer failed");
            emit EmergencyWithdrawn(_token, balance);
        }
    }

    function _claimInternal(
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) internal {
        require(block.timestamp >= claimStartTime, "Claim not started");
        require(block.timestamp <= claimEndTime, "Claim ended");
        require(!hasClaimed[account], "Already claimed");

        bytes32 node = keccak256(abi.encodePacked(account, amount));
        require(
            MerkleProof.verify(merkleProof, merkleRoot, node),
            "Invalid proof"
        );

        hasClaimed[account] = true;
        claimedAmount[account] = amount;
        totalClaimed += amount;
        require(token.transfer(account, amount), "Transfer failed");

        emit Claimed(account, amount);
    }
}
