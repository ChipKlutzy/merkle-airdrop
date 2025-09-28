"use client";

import { useSelectedAirdrop } from "@/hooks/useSelectedAirdrop";
import { useTokenSymbol } from "@/hooks/useTokenSymbol";

export function Hero() {
  const { address } = useSelectedAirdrop();
  const symbol = useTokenSymbol(address);

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 pt-20 pb-14 text-center">
      <span className="inline-flex items-center rounded-full bg-violet-soft px-4 py-1.5 text-xs font-semibold text-violet-deep">
        AIRDROP LIVE
      </span>
      <h1 className="text-5xl font-extrabold tracking-tight text-ink">
        Claim your {symbol} tokens
      </h1>
      <p className="text-lg leading-relaxed text-muted">
        Check your eligibility and claim via Merkle proof verification.
      </p>
    </section>
  );
}
