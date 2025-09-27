import { useEffect, useState } from "react";
import { erc20Abi } from "viem";
import { useReadContract } from "wagmi";
import { airdropAbi } from "@/lib/abi";
import { listAirdrops } from "@/lib/airdrop-store";
import { TARGET_CHAIN_ID } from "@/lib/wagmi";

export function useTokenSymbol(
  airdropAddress?: `0x${string}` | null
): string {
  const { data: tokenAddress } = useReadContract({
    address: airdropAddress!,
    abi: airdropAbi,
    functionName: "token",
    chainId: TARGET_CHAIN_ID,
    query: { enabled: Boolean(airdropAddress) },
  });

  const { data: onChainSymbol } = useReadContract({
    address: tokenAddress!,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: TARGET_CHAIN_ID,
    query: { enabled: Boolean(tokenAddress) },
  });

  const [storedSymbol, setStoredSymbol] = useState<string | null>(null);
  useEffect(() => {
    if (!airdropAddress) return;
    const match = listAirdrops().find(
      (a) => a.address.toLowerCase() === airdropAddress.toLowerCase()
    );
    if (match) setStoredSymbol(match.tokenSymbol);
  }, [airdropAddress]);

  return (onChainSymbol as string | undefined) ?? storedSymbol ?? "AIR";
}
