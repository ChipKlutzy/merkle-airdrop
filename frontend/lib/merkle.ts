import {
  concat,
  encodeAbiParameters,
  isAddress,
  keccak256,
  parseUnits,
  type Hex,
} from "viem";

export interface ClaimantInput {
  address: string;
  amount: string; // human units, e.g. "100"
}

export interface MerkleResult {
  root: Hex;
  claims: Record<string, { amount: string; proof: Hex[] }>;
  total: bigint;
}

function leafHash(account: `0x${string}`, amount: bigint): Hex {
  const encoded = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [account, amount]
  );
  return keccak256(keccak256(encoded));
}

function hashPair(a: Hex, b: Hex): Hex {
  const [left, right] =
    BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return keccak256(concat([left, right]));
}

export function parseClaimants(raw: string): ClaimantInput[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [address, amount] = line.split(/[,\s]+/).map((s) => s.trim());
      if (!isAddress(address ?? "")) {
        throw new Error(`Invalid address: "${address ?? line}"`);
      }
      if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error(`Invalid amount for ${address}: "${amount ?? ""}"`);
      }
      return { address: address.toLowerCase(), amount };
    });
}

export function buildMerkleTree(inputs: ClaimantInput[]): MerkleResult {
  const seen = new Set<string>();
  const entries = inputs.map(({ address, amount }) => {
    if (seen.has(address)) throw new Error(`Duplicate address: ${address}`);
    seen.add(address);
    return {
      address,
      amount: parseUnits(amount, 18),
      leaf: leafHash(address as `0x${string}`, parseUnits(amount, 18)),
    };
  });

  let level: Hex[] = entries.map((e) => e.leaf);
  const levels: Hex[][] = [level];
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(
        i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]
      );
    }
    level = next;
    levels.push(level);
  }

  const root = levels[levels.length - 1][0];

  const claims: MerkleResult["claims"] = {};
  entries.forEach((entry, entryIndex) => {
    const proof: Hex[] = [];
    let index = entryIndex;
    for (const lvl of levels) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      if (siblingIndex < lvl.length && lvl.length > 1) {
        proof.push(lvl[siblingIndex]);
      }
      index = Math.floor(index / 2);
    }
    claims[entry.address] = { amount: entry.amount.toString(), proof };
  });

  const total = entries.reduce((sum, e) => sum + e.amount, BigInt(0));
  return { root, claims, total };
}
