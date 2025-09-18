// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Airdrop} from "../src/Airdrop.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}

contract AirdropTest is Test {
    Airdrop public airdrop;
    MockToken public token;
    bytes32 public merkleRoot;
    uint256 public claimStartTime;
    uint256 public claimEndTime;
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    bytes32 public leaf1;
    bytes32 public leaf2;

    function setUp() public {
        vm.startPrank(owner);
        token = new MockToken();
        claimStartTime = block.timestamp + 1 days;
        claimEndTime = block.timestamp + 30 days;

        leaf1 = _leaf(user1, 100 * 10 ** 18);
        leaf2 = _leaf(user2, 200 * 10 ** 18);
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

    function test_Constructor() public view {
        assertEq(address(airdrop.token()), address(token));
        assertEq(airdrop.merkleRoot(), merkleRoot);
        assertEq(airdrop.claimStartTime(), claimStartTime);
        assertEq(airdrop.claimEndTime(), claimEndTime);
    }

    function test_Claim() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        assertEq(MerkleProof.processProof(proof1, leaf1), merkleRoot);
        vm.warp(claimStartTime + 1);
        vm.startPrank(user1);
        airdrop.claim(100 * 10 ** 18, proof1);
        assertEq(token.balanceOf(user1), 100 * 10 ** 18);
        assertTrue(airdrop.hasClaimed(user1));
        vm.stopPrank();

        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = leaf1;
        assertEq(MerkleProof.processProof(proof2, leaf2), merkleRoot);
        vm.startPrank(user2);
        airdrop.claim(200 * 10 ** 18, proof2);
        assertEq(token.balanceOf(user2), 200 * 10 ** 18);
        assertTrue(airdrop.hasClaimed(user2));
        vm.stopPrank();
    }

    function test_RevertWhen_ClaimBeforeStart() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        vm.startPrank(user1);
        vm.expectRevert(Airdrop.ClaimNotStarted.selector);
        airdrop.claim(100 * 10 ** 18, proof1);
        vm.stopPrank();
    }

    function test_RevertWhen_ClaimAfterEnd() public {
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        vm.warp(claimEndTime + 1);
        vm.startPrank(user1);
        vm.expectRevert(Airdrop.ClaimEnded.selector);
        airdrop.claim(100 * 10 ** 18, proof1);
        vm.stopPrank();
    }

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
        proofs[0][0] = leaf2;
        proofs[1][0] = leaf1;
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

    function _leaf(
        address account,
        uint256 amount
    ) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }
}
