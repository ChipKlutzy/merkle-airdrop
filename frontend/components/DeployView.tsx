"use client";

import { useAccount } from "wagmi";
import { DeployForm } from "@/components/DeployForm";

export function DeployView() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-card-border bg-white px-8 py-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <p className="text-sm text-muted">
          Connect your wallet to deploy a token airdrop.
        </p>
      </div>
    );
  }

  return <DeployForm />;
}
