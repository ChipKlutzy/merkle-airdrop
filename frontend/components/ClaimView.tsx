"use client";

import { useSelectedAirdrop } from "@/hooks/useSelectedAirdrop";
import { ClaimCard } from "@/components/ClaimCard";
import { ChainGuard } from "@/components/ChainGuard";

export function ClaimView() {
  const { address: airdropAddress, setAddress, options } = useSelectedAirdrop();

  if (!airdropAddress) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-card-border bg-white px-8 py-10 text-center text-sm text-muted">
        No airdrop found.{" "}
        <a href="/deploy" className="font-semibold text-violet hover:underline">
          Deploy one →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {options.length > 1 && (
        <select
          value={airdropAddress}
          onChange={(e) => setAddress(e.target.value as `0x${string}`)}
          className="rounded-full border border-card-border bg-white px-5 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.address} value={o.address}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <ChainGuard>
        <ClaimCard airdropAddress={airdropAddress} />
      </ChainGuard>
    </div>
  );
}
