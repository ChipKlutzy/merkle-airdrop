"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { truncateAddress } from "@/lib/format";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return (
      <button
        disabled={isPending}
        onClick={() => {
          const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
          if (injected) connect({ connector: injected });
        }}
        className="rounded-full border border-card-border bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-violet hover:text-violet disabled:opacity-60"
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-card-border bg-white px-4 py-2.5 font-mono text-xs text-muted">
        <span className="size-1.5 rounded-full bg-violet" />
        {truncateAddress(address)}
      </span>
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        className="rounded-full px-3 py-2.5 text-xs font-medium text-muted transition hover:text-ink"
      >
        Disconnect
      </button>
    </div>
  );
}
