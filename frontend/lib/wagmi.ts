import { createConfig, http, injected } from "wagmi";
import { foundry, rootstockTestnet } from "wagmi/chains";

export const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31);

const chains = [rootstockTestnet, foundry] as const;

export const config = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [rootstockTestnet.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://public-node.testnet.rsk.co"
    ),
    [foundry.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export const AIRDROP_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
