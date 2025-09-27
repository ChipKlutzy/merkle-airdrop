import { useEffect, useState } from "react";
import { listAirdrops } from "@/lib/airdrop-store";
import { shortAddress } from "@/lib/format";
import { AIRDROP_ADDRESS } from "@/lib/wagmi";

export interface AirdropOption {
  address: `0x${string}`;
  label: string;
}

export function useSelectedAirdrop() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [options, setOptions] = useState<AirdropOption[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("airdrop");
    const stored = listAirdrops();

    const list = stored.map((a) => ({
      address: a.address,
      label: `${a.tokenSymbol} — ${shortAddress(a.address)}`,
    }));
    setOptions(list);

    if (fromQuery) setAddress(fromQuery as `0x${string}`);
    else if (list.length > 0) setAddress(list[list.length - 1].address);
    else if (AIRDROP_ADDRESS) setAddress(AIRDROP_ADDRESS);
  }, []);

  return { address, setAddress, options };
}
