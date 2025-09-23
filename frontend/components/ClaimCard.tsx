"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { airdropAbi } from "@/lib/abi";
import {
  AIRDROP_ADDRESS,
  TARGET_CHAIN_ID,
  config,
} from "@/lib/wagmi";
import { getClaim, type ClaimEntry } from "@/lib/claims";
import { formatAmount, shortAddress } from "@/lib/format";
import { useCountdown } from "@/hooks/useCountdown";
import { useEffect } from "react";

type Status =
  | "loading"
  | "not-connected"
  | "not-started"
  | "ended"
  | "claimed"
  | "eligible"
  | "not-eligible";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-card-border py-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{children}</span>
    </div>
  );
}

export function ClaimCard() {
  const { address, isConnected } = useAccount();
  const [entry, setEntry] = useState<ClaimEntry | null>(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [txMessage, setTxMessage] = useState<string | null>(null);

  const { data: startTime } = useReadContract({
    address: AIRDROP_ADDRESS,
    abi: airdropAbi,
    functionName: "claimStartTime",
    chainId: TARGET_CHAIN_ID,
  });
  const { data: endTime, refetch: refetchEndTime } = useReadContract({
    address: AIRDROP_ADDRESS,
    abi: airdropAbi,
    functionName: "claimEndTime",
    chainId: TARGET_CHAIN_ID,
  });
  const { data: hasClaimedData, refetch: refetchHasClaimed } = useReadContract({
    address: AIRDROP_ADDRESS,
    abi: airdropAbi,
    functionName: "hasClaimed",
    args: [address!],
    chainId: TARGET_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const hasClaimed = Boolean(hasClaimedData);
  const countdown = useCountdown(endTime);

  useEffect(() => {
    setClaimsLoaded(false);
    if (!address) return;
    let active = true;
    getClaim(address).then((e) => {
      if (active) {
        setEntry(e);
        setClaimsLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [address]);

  const { writeContractAsync } = useWriteContract();

  async function claim() {
    if (!entry) return;
    try {
      setTxMessage("Confirm in your wallet…");
      const hash = await writeContractAsync({
        address: AIRDROP_ADDRESS,
        abi: airdropAbi,
        functionName: "claim",
        args: [BigInt(entry.amount), entry.proof],
        chainId: TARGET_CHAIN_ID,
      });
      setTxMessage("Transaction submitted — waiting for confirmation…");
      await waitForTransactionReceipt(config, { hash });
      setTxMessage(null);
      await Promise.all([refetchHasClaimed(), refetchEndTime()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setTxMessage(msg.includes("User rejected") ? null : `Error: ${msg}`);
    }
  }

  let status: Status;
  if (!isConnected || !address) status = "not-connected";
  else if (!claimsLoaded || startTime === undefined || endTime === undefined)
    status = "loading";
  else if (hasClaimed) status = "claimed";
  else if (Date.now() / 1000 < Number(startTime)) status = "not-started";
  else if (Date.now() / 1000 > Number(endTime)) status = "ended";
  else status = entry ? "eligible" : "not-eligible";

  const displayAmount =
    status === "eligible" && entry ? `${formatAmount(entry.amount)} AIR` : null;

  const badgeStyles = {
    loading: "bg-ghost text-muted",
    "not-connected": "bg-ghost text-muted",
    "not-started": "bg-violet-soft text-violet-deep",
    ended: "bg-ghost text-muted",
    claimed: "bg-green-100 text-green-700",
    eligible: "bg-green-100 text-green-700",
    "not-eligible": "bg-red-50 text-red-600",
  };

  const badgeText = {
    loading: "Loading…",
    "not-connected": "Not connected",
    "not-started": "Not started",
    ended: "Claim ended",
    claimed: "Already claimed ✓",
    eligible: "Eligible",
    "not-eligible": "Not eligible",
  };

  function renderBody() {
    switch (status) {
      case "not-connected":
        return (
          <p className="py-2 text-center text-sm text-muted">
            Connect your wallet to check your allocation.
          </p>
        );
      case "eligible":
        return (
          <>
            <Row label="Wallet">
              <span className="font-mono text-xs">
                {shortAddress(address!, 6, 4)}
              </span>
            </Row>
            <Row label="Claim window">
              {countdown && !countdown.expired
                ? `Ends in ${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`
                : "Closing…"}
            </Row>
          </>
        );
      default:
        return (
          <p className="py-2 text-center text-sm text-muted">
            {status === "not-eligible"
              ? "This address is not on the Merkle tree."
              : status === "claimed"
                ? "You have already claimed your allocation."
                : null}
          </p>
        );
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-card-border bg-white px-8 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Your Allocation
      </h2>
      <p className="mt-3 mb-6 text-4xl font-extrabold tracking-tight text-violet-deep">
        {displayAmount ?? "—"}
      </p>

      <div className="mb-5 flex items-center justify-between text-sm">
        <span className="text-muted">Status</span>
        <span
          className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold ${badgeStyles[status]}`}
        >
          {badgeText[status]}
        </span>
      </div>

      {renderBody()}

      <button
        disabled={status !== "eligible" || !!txMessage}
        onClick={claim}
        className="mt-6 w-full rounded-full bg-violet px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-deep disabled:cursor-not-allowed disabled:opacity-40"
      >
        {txMessage ??
          (displayAmount ? `Claim ${displayAmount}` : "Connect Wallet to Claim")}
      </button>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        Claims are verified with a Merkle proof. One claim per address.
      </p>
    </div>
  );
}
