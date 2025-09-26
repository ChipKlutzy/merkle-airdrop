export interface StoredAirdrop {
  address: `0x${string}`;
  token: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  merkleRoot: `0x${string}`;
  claimStart: number;
  claimEnd: number;
  createdAt: number;
}

const AIRDROPS_KEY = "merkl:airdrops";
const CLAIMS_KEY = (address: string) => `merkl:claims:${address.toLowerCase()}`;

export function listAirdrops(): StoredAirdrop[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AIRDROPS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAirdrop(
  airdrop: StoredAirdrop,
  claims: Record<string, { amount: string; proof: string[] }>
) {
  const existing = listAirdrops().filter(
    (a) => a.address.toLowerCase() !== airdrop.address.toLowerCase()
  );
  localStorage.setItem(AIRDROPS_KEY, JSON.stringify([...existing, airdrop]));
  localStorage.setItem(CLAIMS_KEY(airdrop.address), JSON.stringify(claims));
}

export function getStoredClaims(
  airdropAddress: string
): Record<string, { amount: string; proof: string[] }> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CLAIMS_KEY(airdropAddress));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
