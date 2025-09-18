// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title Airdrop
 * @dev A secure and gas-efficient airdrop contract that uses Merkle proofs for claim verification.
 * This contract allows for:
 * - Time-bound claim periods
 * - Merkle proof verification for gas-efficient claims
 * - Batch claims for multiple recipients
 * - Claiming on behalf of another account
 * - Emergency withdrawal functionality
 * - Pausable operations
 * - Reentrancy protection
 */
contract Airdrop is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The ERC20 token being airdropped
    IERC20 public immutable token;

    /// @notice The Merkle root of the airdrop distribution
    bytes32 public merkleRoot;

    /// @notice The timestamp when claims can start
    uint256 public claimStartTime;

    /// @notice The timestamp when claims end
    uint256 public claimEndTime;

    /// @notice The maximum number of claims allowed in a single batch call
    uint256 public constant MAX_BATCH_SIZE = 100;

    /// @notice Mapping to track which addresses have claimed their tokens
    mapping(address => bool) public hasClaimed;

    /// @notice Mapping to track how many tokens each address has claimed
    mapping(address => uint256) public claimedAmount;

    /// @notice The total amount of tokens claimed so far
    uint256 public totalClaimed;

    /// @notice Emitted when a user successfully claims their tokens
    /// @param account The address that received the claimed tokens
    /// @param amount The amount of tokens claimed
    event Claimed(address indexed account, uint256 amount);

    /// @notice Emitted when the Merkle root is updated
    /// @param merkleRoot The new Merkle root
    event MerkleRootUpdated(bytes32 merkleRoot);

    /// @notice Emitted when the claim period is updated
    /// @param startTime The new claim start time
    /// @param endTime The new claim end time
    event ClaimPeriodUpdated(uint256 startTime, uint256 endTime);

    /// @notice Emitted when the owner withdraws funds via emergencyWithdraw
    /// @param token The token withdrawn (address(0) for native currency)
    /// @param amount The amount withdrawn
    event EmergencyWithdrawn(address indexed token, uint256 amount);

    /// @notice Thrown when an invalid token address is provided
    error InvalidTokenAddress();
    /// @notice Thrown when the claim period is invalid (start >= end)
    error InvalidClaimPeriod();
    /// @notice Thrown when a claim is attempted before the claim period starts
    error ClaimNotStarted();
    /// @notice Thrown when a claim is attempted after the claim period ends
    error ClaimEnded();
    /// @notice Thrown when an address attempts to claim more than once
    error AlreadyClaimed();
    /// @notice Thrown when a Merkle proof fails verification
    error InvalidProof();
    /// @notice Thrown when input arrays have mismatched lengths
    error ArrayLengthMismatch();
    /// @notice Thrown when batch arrays are empty or exceed the batch size limit
    error InvalidBatchSize();
    /// @notice Thrown when claiming zero tokens
    error ZeroAmount();
    /// @notice Thrown when claiming on behalf of the zero address
    error InvalidAccount();
    /// @notice Thrown when a token or native transfer fails
    error TransferFailed();
    /// @notice Thrown when there is nothing to withdraw
    error NothingToWithdraw();

    /**
     * @dev Constructor initializes the airdrop contract
     * @param _token The address of the ERC20 token to be airdropped
     * @param _merkleRoot The Merkle root of the airdrop distribution
     * @param _claimStartTime The timestamp when claims can start
     * @param _claimEndTime The timestamp when claims end
     */
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

    /**
     * @dev Pauses the contract, preventing new claims
     * @notice Only callable by the contract owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract, allowing claims to resume
     * @notice Only callable by the contract owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Updates the Merkle root for claim verification
     * @param _merkleRoot The new Merkle root
     * @notice Only callable by the contract owner
     */
    function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(_merkleRoot);
    }

    /**
     * @dev Updates the claim period
     * @param _startTime The new claim start time
     * @param _endTime The new claim end time
     * @notice Only callable by the contract owner
     */
    function updateClaimPeriod(
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner {
        if (_startTime >= _endTime) revert InvalidClaimPeriod();
        claimStartTime = _startTime;
        claimEndTime = _endTime;
        emit ClaimPeriodUpdated(_startTime, _endTime);
    }

    /**
     * @dev Allows a user to claim their airdrop tokens
     * @param amount The amount of tokens to claim
     * @param merkleProof The Merkle proof verifying the claim
     * @notice Requires valid Merkle proof and must be within claim period
     */
    function claim(
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant whenNotPaused {
        _claimInternal(msg.sender, amount, merkleProof);
    }

    /**
     * @dev Allows a caller to claim tokens on behalf of another account
     * @param account The address that is entitled to the airdrop
     * @param amount The amount of tokens to claim
     * @param merkleProof The Merkle proof verifying the claim
     * @notice The claimed tokens are sent to `account`, not to the caller
     */
    function claimFor(
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant whenNotPaused {
        if (account == address(0)) revert InvalidAccount();
        _claimInternal(account, amount, merkleProof);
    }

    /**
     * @dev Allows batch claiming of tokens for multiple recipients
     * @param accounts Array of recipient addresses
     * @param amounts Array of token amounts to claim
     * @param merkleProofs Array of Merkle proofs for each claim
     * @notice Requires valid Merkle proofs and must be within claim period
     */
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
                bytes32 node = _leaf(accounts[i], amounts[i]);
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

    /**
     * @dev Allows the owner to withdraw tokens in case of emergency
     * @param _token The address of the token to withdraw (address(0) for native currency)
     * @notice Only callable by the contract owner
     */
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

    /**
     * @dev Computes the Merkle leaf for a claim
     * @param account The address of the claimant
     * @param amount The amount of tokens claimed
     * @return The double-hashed leaf used in Merkle proof verification
     * @notice Double-hashing prevents second preimage attacks
     */
    function _leaf(
        address account,
        uint256 amount
    ) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }

    /**
     * @dev Internal claim logic shared by claim and claimFor
     * @param account The account receiving the tokens
     * @param amount The amount of tokens to claim
     * @param merkleProof The Merkle proof verifying the claim
     */
    function _claimInternal(
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) internal {
        if (block.timestamp < claimStartTime) revert ClaimNotStarted();
        if (block.timestamp > claimEndTime) revert ClaimEnded();
        if (amount == 0) revert ZeroAmount();
        if (hasClaimed[account]) revert AlreadyClaimed();

        bytes32 node = _leaf(account, amount);
        if (!MerkleProof.verify(merkleProof, merkleRoot, node))
            revert InvalidProof();

        hasClaimed[account] = true;
        claimedAmount[account] = amount;
        totalClaimed += amount;
        token.safeTransfer(account, amount);

        emit Claimed(account, amount);
    }
}
