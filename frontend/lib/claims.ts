export interface ClaimEntry {
  amount: string;
  proof: `0x${string}`[];
}

export type ClaimsData = Record<string, ClaimEntry>;

let cache: ClaimsData | null = null;

export async function loadClaims(): Promise<ClaimsData> {
  if (cache) return cache;
  const res = await fetch("/claims.json");
  if (!res.ok) return {};
  cache = (await res.json()) as ClaimsData;
  return cache;
}

export async function getClaim(address: string): Promise<ClaimEntry | null> {
  const claims = await loadClaims();
  return claims[address.toLowerCase()] ?? null;
}
