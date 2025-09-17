// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Airdrop is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    bytes32 public merkleRoot;
    uint256 public claimStartTime;
    uint256 public claimEndTime;
    uint256 public constant MAX_BATCH_SIZE = 100;
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public claimedAmount;
    uint256 public totalClaimed;

    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 merkleRoot);
    event ClaimPeriodUpdated(uint256 startTime, uint256 endTime);
    event EmergencyWithdrawn(address indexed token, uint256 amount);

    error InvalidTokenAddress();
    error InvalidClaimPeriod();
    error ClaimNotStarted();
    error ClaimEnded();
    error AlreadyClaimed();
    error InvalidProof();
    error ArrayLengthMismatch();
    error InvalidBatchSize();
    error ZeroAmount();
    error InvalidAccount();
    error TransferFailed();
    error NothingToWithdraw();

    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _claimStartTime,
        uint256 _claimEndTime
    ) Ownable(msg.sender) Pausable() ReentrancyGuard() {
        if (_token == address(0)) revert InvalidTokenAddress();
        if (_claimStartTime >= _claimEndTime) revert InvalidClaimPeriod();

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
        if (_startTime >= _endTime) revert InvalidClaimPeriod();
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
        if (account == address(0)) revert InvalidAccount();
        _claimInternal(account, amount, merkleProof);
    }

    function batchClaim(
        address[] calldata accounts,
        uint256[] calldata amounts,
        bytes32[][] calldata merkleProofs
    ) external nonReentrant whenNotPaused {
        if (block.timestamp < claimStartTime) revert ClaimNotStarted();
        if (block.timestamp > claimEndTime) revert ClaimEnded();
        uint256 len = accounts.length;
        if (len == 0 || len > MAX_BATCH_SIZE) revert InvalidBatchSize();
        if (amounts.length != len || merkleProofs.length != len)
            revert ArrayLengthMismatch();

        for (uint256 i = 0; i < len; i++) {
            if (!hasClaimed[accounts[i]]) {
                bytes32 node = keccak256(
                    abi.encodePacked(accounts[i], amounts[i])
                );
                if (!MerkleProof.verify(merkleProofs[i], merkleRoot, node))
                    revert InvalidProof();

                hasClaimed[accounts[i]] = true;
                claimedAmount[accounts[i]] = amounts[i];
                totalClaimed += amounts[i];
                token.safeTransfer(accounts[i], amounts[i]);

                emit Claimed(accounts[i], amounts[i]);
            }
        }
    }

    function emergencyWithdraw(address _token) external onlyOwner nonReentrant {
        if (_token == address(0)) {
            uint256 balance = address(this).balance;
            if (balance == 0) revert NothingToWithdraw();

            (bool success, ) = owner().call{value: balance}("");
            if (!success) revert TransferFailed();

            emit EmergencyWithdrawn(_token, balance);
        } else {
            IERC20 erc20 = IERC20(_token);
            uint256 balance = erc20.balanceOf(address(this));
            if (balance == 0) revert NothingToWithdraw();

            erc20.safeTransfer(owner(), balance);
            emit EmergencyWithdrawn(_token, balance);
        }
    }

    function _claimInternal(
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) internal {
        if (block.timestamp < claimStartTime) revert ClaimNotStarted();
        if (block.timestamp > claimEndTime) revert ClaimEnded();
        if (amount == 0) revert ZeroAmount();
        if (hasClaimed[account]) revert AlreadyClaimed();

        bytes32 node = keccak256(abi.encodePacked(account, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node))
            revert InvalidProof();

        hasClaimed[account] = true;
        claimedAmount[account] = amount;
        totalClaimed += amount;
        token.safeTransfer(account, amount);

        emit Claimed(account, amount);
    }
}
