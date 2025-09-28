"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { TARGET_CHAIN, TARGET_CHAIN_ID } from "@/lib/wagmi";

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === TARGET_CHAIN_ID) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-card-border bg-white px-8 py-8 text-center">
      <p className="text-sm text-muted">
        Your wallet is on the wrong network.
      </p>
      <button
        onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
        disabled={isPending}
        className="mt-4 rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-deep disabled:opacity-60"
      >
        {isPending ? "Switching…" : `Switch to ${TARGET_CHAIN.name}`}
      </button>
    </div>
  );
}
