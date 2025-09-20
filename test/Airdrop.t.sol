// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Airdrop} from "../src/Airdrop.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title MockToken
 * @dev A simple ERC20 token implementation for testing purposes
 * @notice Mints 1,000,000 tokens to the deployer upon creation
 */
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}

/**
 * @title AirdropTest
 * @dev Test suite for the Airdrop contract
 * @notice Tests all major functionality including claims, batch claims, and emergency withdrawals
 */
contract AirdropTest is Test {
    /// @notice The Airdrop contract instance being tested
    Airdrop public airdrop;

    /// @notice The mock token used for testing
    MockToken public token;

    /// @notice The Merkle root for claim verification
    bytes32 public merkleRoot;

    /// @notice The start time for claims
    uint256 public claimStartTime;

    /// @notice The end time for claims
    uint256 public claimEndTime;

    /// @notice Test addresses
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);

    /// @notice Merkle tree leaves for test users
    bytes32 public leaf1;
    bytes32 public leaf2;

    /**
     * @dev Sets up the test environment
     * @notice Creates a new token, sets up Merkle tree, and deploys the airdrop contract
     */
    function setUp() public {
        vm.startPrank(owner);
        token = new MockToken();
        claimStartTime = block.timestamp + 1 days;
        claimEndTime = block.timestamp + 30 days;

        leaf1 = _leaf(user1, 100 * 10 ** 18);
        leaf2 = _leaf(user2, 200 * 10 ** 18);
        // Sort leaves for OpenZeppelin Merkle root
        bytes32 left = leaf1 < leaf2 ? leaf1 : leaf2;
        bytes32 right = leaf1 < leaf2 ? leaf2 : leaf1;
        merkleRoot = keccak256(abi.encodePacked(left, right));

        airdrop = new Airdrop(
            address(token),
            merkleRoot,
            claimStartTime,
            claimEndTime
        );

        token.transfer(address(airdrop), 1000 * 10 ** 18);
        vm.stopPrank();
    }

    /**
     * @dev Tests the constructor initialization
     * @notice Verifies that all constructor parameters are set correctly
     */
    function test_Constructor() public view {
        assertEq(address(airdrop.token()), address(token));
        assertEq(airdrop.merkleRoot(), merkleRoot);
        assertEq(airdrop.claimStartTime(), claimStartTime);
        assertEq(airdrop.claimEndTime(), claimEndTime);
    }

    /**
     * @dev Tests the claim functionality
     * @notice Verifies that users can claim their tokens with valid Merkle proofs
     */
    function test_Claim() public {
        // user1 (left leaf): proof is [leaf2]
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        // Check root calculation for user1
        assertEq(MerkleProof.processProof(proof1, leaf1), merkleRoot);
        vm.warp(claimStartTime + 1);
        vm.startPrank(user1);
        airdrop.claim(100 * 10 ** 18, proof1);
        assertEq(token.balanceOf(user1), 100 * 10 ** 18);
        assertTrue(airdrop.hasClaimed(user1));
        vm.stopPrank();

        // user2 (right leaf): proof is [leaf1]
        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = leaf1;
        // Check root calculation for user2
        assertEq(MerkleProof.processProof(proof2, leaf2), merkleRoot);
        vm.startPrank(user2);
        airdrop.claim(200 * 10 ** 18, proof2);
        assertEq(token.balanceOf(user2), 200 * 10 ** 18);
        assertTrue(airdrop.hasClaimed(user2));
        vm.stopPrank();
    }

    /**
     * @dev Tests claim rejection before start time
     * @notice Verifies that claims are rejected before the claim period starts
     */
    function test_RevertWhen_ClaimBeforeStart() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        vm.startPrank(user1);
        vm.expectRevert(Airdrop.ClaimNotStarted.selector);
        airdrop.claim(100 * 10 ** 18, proof1);
        vm.stopPrank();
    }

    /**
     * @dev Tests claim rejection after end time
     * @notice Verifies that claims are rejected after the claim period ends
     */
    function test_RevertWhen_ClaimAfterEnd() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        vm.warp(claimEndTime + 1);
        vm.startPrank(user1);
        vm.expectRevert(Airdrop.ClaimEnded.selector);
        airdrop.claim(100 * 10 ** 18, proof1);
        vm.stopPrank();
    }

    /**
     * @dev Tests double claim prevention
     * @notice Verifies that users cannot claim their tokens more than once
     */
    function test_RevertWhen_DoubleClaim() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        vm.warp(claimStartTime + 1);
        vm.startPrank(user1);
        airdrop.claim(100 * 10 ** 18, proof1);
        vm.expectRevert(Airdrop.AlreadyClaimed.selector);
        airdrop.claim(100 * 10 ** 18, proof1);
        vm.stopPrank();
    }

    /**
     * @dev Tests batch claim functionality
     * @notice Verifies that multiple users can claim their tokens in a single transaction
     */
    function test_BatchClaim() public {
        address[] memory accounts = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        bytes32[][] memory proofs = new bytes32[][](2);
        accounts[0] = user1;
        accounts[1] = user2;
        amounts[0] = 100 * 10 ** 18;
        amounts[1] = 200 * 10 ** 18;
        proofs[0] = new bytes32[](1);
        proofs[1] = new bytes32[](1);
        proofs[0][0] = leaf2; // user1's proof
        proofs[1][0] = leaf1; // user2's proof
        // Check root calculation for both
        assertEq(MerkleProof.processProof(proofs[0], leaf1), merkleRoot);
        assertEq(MerkleProof.processProof(proofs[1], leaf2), merkleRoot);
        vm.warp(claimStartTime + 1);
        vm.startPrank(owner);
        airdrop.batchClaim(accounts, amounts, proofs);
        assertEq(token.balanceOf(user1), 100 * 10 ** 18);
        assertEq(token.balanceOf(user2), 200 * 10 ** 18);
        assertTrue(airdrop.hasClaimed(user1));
        assertTrue(airdrop.hasClaimed(user2));
        vm.stopPrank();
    }

    /**
     * @dev Tests the claimFor functionality
     * @notice Verifies that a third party can claim on behalf of an eligible account
     */
    function test_ClaimFor() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        vm.warp(claimStartTime + 1);

        address caller = address(4);
        vm.startPrank(caller);
        airdrop.claimFor(user1, 100 * 10 ** 18, proof1);
        vm.stopPrank();

        assertEq(token.balanceOf(user1), 100 * 10 ** 18);
        assertTrue(airdrop.hasClaimed(user1));
        assertEq(airdrop.claimedAmount(user1), 100 * 10 ** 18);
    }

    /**
     * @dev Tests that claiming zero tokens is rejected
     */
    function test_RevertWhen_ZeroAmount() public {
        bytes32[] memory proof = new bytes32[](0);
        vm.warp(claimStartTime + 1);
        vm.startPrank(user1);
        vm.expectRevert(Airdrop.ZeroAmount.selector);
        airdrop.claim(0, proof);
        vm.stopPrank();
    }

    /**
     * @dev Tests that claiming on behalf of the zero address is rejected
     */
    function test_RevertWhen_ClaimForZeroAddress() public {
        bytes32[] memory proof = new bytes32[](0);
        vm.warp(claimStartTime + 1);
        vm.startPrank(user1);
        vm.expectRevert(Airdrop.InvalidAccount.selector);
        airdrop.claimFor(address(0), 100 * 10 ** 18, proof);
        vm.stopPrank();
    }

    /**
     * @dev Tests that an empty batch claim is rejected
     */
    function test_RevertWhen_EmptyBatch() public {
        address[] memory accounts = new address[](0);
        uint256[] memory amounts = new uint256[](0);
        bytes32[][] memory proofs = new bytes32[][](0);
        vm.warp(claimStartTime + 1);
        vm.expectRevert(Airdrop.InvalidBatchSize.selector);
        airdrop.batchClaim(accounts, amounts, proofs);
    }

    /**
     * @dev Tests that mismatched batch array lengths are rejected
     */
    function test_RevertWhen_BatchLengthMismatch() public {
        address[] memory accounts = new address[](2);
        uint256[] memory amounts = new uint256[](1);
        bytes32[][] memory proofs = new bytes32[][](1);
        accounts[0] = user1;
        accounts[1] = user2;
        amounts[0] = 100 * 10 ** 18;
        proofs[0] = new bytes32[](1);
        vm.warp(claimStartTime + 1);
        vm.expectRevert(Airdrop.ArrayLengthMismatch.selector);
        airdrop.batchClaim(accounts, amounts, proofs);
    }

    /**
     * @dev Tests that claimed amounts and total are tracked correctly
     */
    function test_ClaimedAmountTracking() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        vm.warp(claimStartTime + 1);
        vm.startPrank(user1);
        airdrop.claim(100 * 10 ** 18, proof1);
        vm.stopPrank();

        assertEq(airdrop.claimedAmount(user1), 100 * 10 ** 18);
        assertEq(airdrop.totalClaimed(), 100 * 10 ** 18);
    }

    /**
     * @dev Tests emergency withdrawal functionality
     * @notice Verifies that the owner can withdraw tokens in case of emergency
     */
    function test_EmergencyWithdraw() public {
        vm.startPrank(owner);
        airdrop.emergencyWithdraw(address(token));
        assertEq(token.balanceOf(owner), 1000000 * 10 ** 18);
        vm.stopPrank();
    }

    /**
     * @dev Helper to compute the double-hashed Merkle leaf for a claim
     * @param account The claimant address
     * @param amount The claim amount
     */
    function _leaf(
        address account,
        uint256 amount
    ) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }
}
