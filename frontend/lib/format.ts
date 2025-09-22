import { formatUnits } from "viem";

export function formatAmount(raw: string): string {
  try {
    const n = Number(formatUnits(BigInt(raw), 18));
    return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  } catch {
    return "—";
  }
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function shortAddress(address: string, prefix = 10, suffix = 8): string {
  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`;
}
