// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Airdrop} from "../src/Airdrop.sol";
import {MockToken} from "../src/MockToken.sol";

/**
 * @title DeployAirdrop
 * @dev Script for deploying the Airdrop contract and its dependencies
 * @notice This script deploys a mock token and the airdrop contract with example Merkle tree data
 */
contract DeployAirdrop is Script {
    /**
     * @dev Main deployment function
     * @notice Deploys the mock token and airdrop contract, sets up the Merkle tree,
     * and transfers initial tokens to the airdrop contract
     */
    function run() external {
        // uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast();

        // Deploy mock token for testing (replace with your actual token address in production)
        MockToken token = new MockToken("AirdropToken", "AIRDROP");

        // Set up Merkle root (example with two addresses)
        address user1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address user2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

        // Create Merkle tree leaves for each user (double-hashed)
        bytes32 leaf1 = _leaf(user1, uint256(100 * 10 ** 18));
        bytes32 leaf2 = _leaf(user2, uint256(200 * 10 ** 18));

        // Sort leaves for OpenZeppelin Merkle root
        bytes32 left = leaf1 < leaf2 ? leaf1 : leaf2;
        bytes32 right = leaf1 < leaf2 ? leaf2 : leaf1;
        bytes32 merkleRoot = keccak256(abi.encodePacked(left, right));

        // Set claim period (1 day from now to 30 days from now)
        uint256 claimStartTime = block.timestamp + 1 days;
        uint256 claimEndTime = block.timestamp + 30 days;

        // Deploy airdrop contract with configured parameters
        Airdrop airdrop = new Airdrop(
            address(token),
            merkleRoot,
            claimStartTime,
            claimEndTime
        );

        // Transfer initial tokens to airdrop contract
        token.transfer(address(airdrop), 1000 * 10 ** 18);

        vm.stopBroadcast();

        // Log deployment information for verification
        console.log("Token deployed to:");
        console.log(address(token));
        console.log("Airdrop deployed to:");
        console.log(address(airdrop));
        console.log("Merkle root:");
        console.logBytes32(merkleRoot);
        console.log("Claim start time:");
        console.logUint(claimStartTime);
        console.log("Claim end time:");
        console.logUint(claimEndTime);
    }

    /**
     * @dev Computes the double-hashed Merkle leaf for a claim
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
