import { keccak256, toBytes, numberToHex } from "viem";
import { writeFileSync } from "node:fs";

const ALLOCATIONS = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", amount: "100000000000000000000" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", amount: "200000000000000000000" },
];

function encodeLeaf(account, amount) {
  const paddedAddress =
    account.toLowerCase().slice(2).padStart(64, "0");
  const hexAmount = BigInt(amount).toString(16).padStart(64, "0");
  return keccak256(toBytes(`0x${paddedAddress}${hexAmount}`));
}

function leafHash(account, amount) {
  const inner = encodeLeaf(account, amount);
  return keccak256(toBytes(inner));
}

function hashPair(a, b) {
  return keccak256(
    toBytes(BigInt(a) < BigInt(b) ? a + b.slice(2) : b + a.slice(2))
  );
}

const leaves = ALLOCATIONS.map(({ address, amount }) => ({
  ...{ address, amount },
  leaf: leafHash(address, amount),
}));

const merkleRoot =
  leaves.length === 1
    ? leaves[0].leaf
    : hashPair(leaves[0].leaf, leaves[1].leaf);

const claims = {};
for (const item of leaves) {
  const other = leaves.find((l) => l.leaf !== item.leaf);
  claims[item.address.toLowerCase()] = {
    amount: item.amount,
    proof: leaves.length <= 1 ? [] : [other.leaf],
  };
}

console.log("Merkle root:", merkleRoot);
writeFileSync("public/claims.json", JSON.stringify(claims, null, 2));
console.log("Wrote public/claims.json");
