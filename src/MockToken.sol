// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockToken
 * @dev A simple ERC20 token implementation for testing purposes.
 * This contract inherits from OpenZeppelin's ERC20 implementation and
 * automatically mints 1,000,000 tokens to the deployer upon creation.
 */
contract MockToken is ERC20 {
    /**
     * @dev Constructor creates a new MockToken with specified name and symbol
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @notice Automatically mints 1,000,000 tokens to the deployer
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint 1,000,000 tokens to the deployer
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
