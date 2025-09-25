import { createConfig, http, injected } from "wagmi";
import { foundry, hoodi, rootstockTestnet } from "wagmi/chains";

export const TARGET_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? 560048
) as 31 | 560048 | 31337;

const chains = [hoodi, rootstockTestnet, foundry] as const;

export const config = createConfig({
  chains,
  connectors: [injected()],
  transports: {
    [hoodi.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? hoodi.rpcUrls.default.http[0]
    ),
    [rootstockTestnet.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://public-node.testnet.rsk.co"
    ),
    [foundry.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export const TARGET_CHAIN = chains.find((c) => c.id === TARGET_CHAIN_ID)!;

export const EXPLORER = TARGET_CHAIN.blockExplorers?.default.url ?? null;

export const AIRDROP_ADDRESS = (process.env.NEXT_PUBLIC_AIRDROP_ADDRESS ??
  "") as `0x${string}`;
