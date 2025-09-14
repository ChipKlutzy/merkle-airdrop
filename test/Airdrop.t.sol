// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Airdrop} from "../src/Airdrop.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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

        leaf1 = keccak256(abi.encodePacked(user1, uint256(100 * 10 ** 18)));
        leaf2 = keccak256(abi.encodePacked(user2, uint256(200 * 10 ** 18)));
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
}
