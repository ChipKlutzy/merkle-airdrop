# Advanced Airdrop Contract

This project implements an advanced airdrop contract with Merkle tree-based claims, time-locked claims, batch claiming capability, and emergency controls. The project is built using Foundry and OpenZeppelin contracts.

## Project Structure

```
├── src/
│   ├── Airdrop.sol      # Main airdrop contract
│   └── MockToken.sol    # ERC20 token for testing
├── script/
│   └── Airdrop.s.sol  # Deployment script
├── test/
│   └── Airdrop.t.sol    # Test file
└── foundry.toml         # Foundry configuration
```

## Contracts

### 1. MockToken.sol
A simple ERC20 token implementation using OpenZeppelin's ERC20 contract.

```solidity
contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
```

**Functions:**
- `constructor(string memory name, string memory symbol)`: Creates a new token with specified name and symbol, mints 1,000,000 tokens to the deployer
- Inherits all standard ERC20 functions from OpenZeppelin:
  - `transfer(address to, uint256 amount)`: Transfers tokens to another address
  - `transferFrom(address from, address to, uint256 amount)`: Transfers tokens on behalf of another address
  - `approve(address spender, uint256 amount)`: Approves another address to spend tokens
  - `allowance(address owner, address spender)`: Returns the amount of tokens approved for spending
  - `balanceOf(address account)`: Returns the token balance of an address

### 2. Airdrop.sol
The main airdrop contract that handles token distribution using Merkle proofs.

**State Variables:**
- `token`: The ERC20 token being airdropped
- `merkleRoot`: Root of the Merkle tree containing all eligible claims
- `claimStartTime`: When claims can begin
- `claimEndTime`: When claims end
- `claimed`: Mapping of addresses to their claimed status

**Events:**
- `Claimed(address indexed account, uint256 amount)`: Emitted when tokens are claimed
- `MerkleRootUpdated(bytes32 merkleRoot)`: Emitted when the Merkle root is updated
- `ClaimPeriodUpdated(uint256 startTime, uint256 endTime)`: Emitted when claim period is updated

**Functions:**
1. **Constructor**
   ```solidity
   constructor(
       address _token,
       bytes32 _merkleRoot,
       uint256 _claimStartTime,
       uint256 _claimEndTime
   )
   ```
   - Initializes the contract with token address, Merkle root, and claim period

2. **Claim**
   ```solidity
   function claim(
       uint256 amount,
       bytes32[] calldata merkleProof
   ) external whenNotPaused
   ```
   - Allows users to claim their tokens using Merkle proof
   - Verifies the claim hasn't been made before
   - Checks if the claim period is active
   - Transfers tokens to the claimant

3. **Claim For**
   ```solidity
   function claimFor(
       address account,
       uint256 amount,
       bytes32[] calldata merkleProof
   ) external whenNotPaused
   ```
   - Allows a third party to claim on behalf of an eligible account
   - Tokens are sent to `account`, not the caller

4. **Batch Claim**
   ```solidity
   function batchClaim(
       address[] calldata accounts,
       uint256[] calldata amounts,
       bytes32[][] calldata merkleProofs
   ) external whenNotPaused
   ```
   - Allows claiming multiple allocations in one transaction
   - More gas efficient for multiple claims
   - Capped at `MAX_BATCH_SIZE` (100) claims per call

5. **Owner Functions**
   ```solidity
   function updateMerkleRoot(bytes32 _merkleRoot) external onlyOwner
   function updateClaimPeriod(uint256 _startTime, uint256 _endTime) external onlyOwner
   function emergencyWithdraw(address _token) external onlyOwner
   ```
   - `updateMerkleRoot`: Updates the Merkle root for claims
   - `updateClaimPeriod`: Updates the claim period
   - `emergencyWithdraw`: Allows owner to withdraw tokens in case of emergency

6. **Pausable Functions**
   ```solidity
   function pause() external onlyOwner
   function unpause() external onlyOwner
   ```
   - Allows pausing/unpausing the contract in case of emergencies

### 3. DeployAirdrop.s.sol
Deployment script for setting up the airdrop contract.

**Functions:**
- `run()`: Main deployment function that:
  1. Deploys the MockToken
  2. Creates a Merkle root for two example users
  3. Deploys the Airdrop contract
  4. Transfers initial tokens to the Airdrop contract
  5. Logs deployment information

## Testing

The project includes comprehensive tests in `test/Airdrop.t.sol` covering:
- Constructor initialization
- Successful claims
- Failed claims (before start, after end, double claims)
- Batch claims
- Emergency withdrawal
- Owner controls

## Deployment


1. Set up environment variables in `.env`:
   ```
   PRIVATE_KEY=your_private_key_here
   RPC_URL=https://public-node.testnet.rsk.co
   ```
Change Variables if you use foundry key store wallet.

```
uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
 vm.startBroadcast(deployerPrivateKey);
```
2. Deploy to RSK testnet:
   ```bash
   forge script script/Airdrop.s.sol:DeployAirdrop --rpc-url rootstock_testnet --account YOUR_WALLET_NAME --sender YOUR_WALLET_ADDRESS --legacy --broadcast 
   ```

## Security Features

1. **Merkle Tree Verification**: Gas-efficient way to verify claims
2. **Double-Hashed Leaves**: Leaf nodes are double-hashed to prevent second preimage attacks
3. **Time-locked Claims**: Prevents claims before start time and after end time
4. **Pausable**: Emergency stop functionality
5. **Owner Controls**: Ability to update parameters and withdraw in emergencies
6. **ReentrancyGuard**: Prevents reentrancy attacks
7. **SafeERC20**: Safe token transfers for non-standard ERC20 tokens
8. **Custom Errors**: Gas-efficient custom error messages
9. **Zero-Amount & Zero-Address Checks**: Prevents invalid claims
10. **Batch Size Limit**: Prevents gas griefing via oversized batch calls
11. **OpenZeppelin Contracts**: Uses battle-tested implementations

## Gas Optimization

1. **Merkle Proofs**: Instead of storing all claims on-chain
2. **Batch Claims**: Reduces gas costs for multiple claims
3. **Optimized Storage**: Minimal state variables
4. **Efficient Events**: Only essential data in events

## Usage Example

1. Deploy the contract
2. Users can claim their tokens by providing:
   - Their address
   - Claim amount
   - Merkle proof
3. The contract verifies the claim and transfers tokens
4. Owner can update parameters or withdraw in emergencies

## Frontend

A minimal Next.js dApp lives in [`frontend/`](frontend) (branch `frontend`): wallet connect (injected / MetaMask via wagmi), live eligibility check against the deployed `Airdrop` contract, and Merkle-proof claims driven by `frontend/public/claims.json`.

```bash
cd frontend
cp .env.example .env.local          # set NEXT_PUBLIC_AIRDROP_ADDRESS
npm install
npm run dev                         # http://localhost:3000
node scripts/generate-claims.mjs    # regenerate claims + print Merkle root
```
