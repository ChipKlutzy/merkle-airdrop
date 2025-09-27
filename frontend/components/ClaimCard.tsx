"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { airdropAbi } from "@/lib/abi";
import { AIRDROP_ADDRESS, TARGET_CHAIN_ID, config } from "@/lib/wagmi";
import { useTokenSymbol } from "@/hooks/useTokenSymbol";
import { getStoredClaims } from "@/lib/airdrop-store";
import { getClaim, type ClaimEntry } from "@/lib/claims";
import { friendlyError } from "@/lib/errors";
import { formatAmount, shortAddress } from "@/lib/format";
import { useCountdown } from "@/hooks/useCountdown";

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

export function ClaimCard({ airdropAddress }: { airdropAddress: `0x${string}` }) {
  const { address, isConnected } = useAccount();
  const symbol = useTokenSymbol(airdropAddress);
  const [entry, setEntry] = useState<ClaimEntry | null>(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const base = {
    address: airdropAddress,
    abi: airdropAbi,
    chainId: TARGET_CHAIN_ID,
  } as const;

  const { data: startTime } = useReadContract({ ...base, functionName: "claimStartTime" });
  const { data: endTime } = useReadContract({ ...base, functionName: "claimEndTime" });
  const { data: hasClaimedData, refetch: refetchHasClaimed } = useReadContract({
    ...base,
    functionName: "hasClaimed",
    args: [address!],
    query: { enabled: Boolean(address) },
  });

  const hasClaimed = Boolean(hasClaimedData);
  const countdown = useCountdown(endTime);

  useEffect(() => {
    setClaimsLoaded(false);
    setEntry(null);
    if (!address) return;
    let active = true;

    const stored = getStoredClaims(airdropAddress);
    const found = stored?.[address.toLowerCase()];
    if (found) {
      setEntry(found as ClaimEntry);
      setClaimsLoaded(true);
      return () => {
        active = false;
      };
    }
    if (airdropAddress.toLowerCase() === AIRDROP_ADDRESS.toLowerCase()) {
      getClaim(address).then((e) => {
        if (active) {
          setEntry(e);
          setClaimsLoaded(true);
        }
      });
    } else {
      setClaimsLoaded(true);
    }
    return () => {
      active = false;
    };
  }, [address, airdropAddress]);

  const { writeContractAsync } = useWriteContract();

  async function claim() {
    if (!entry) return;
    setTxError(null);
    try {
      setTxMessage("Confirm in your wallet…");
      const hash = await writeContractAsync({
        address: airdropAddress,
        abi: airdropAbi,
        functionName: "claim",
        args: [BigInt(entry.amount), entry.proof],
        chainId: TARGET_CHAIN_ID,
      });
      setTxMessage("Transaction submitted — waiting for confirmation…");
      await waitForTransactionReceipt(config, { hash });
      setTxMessage(null);
      await refetchHasClaimed();
    } catch (err) {
      setTxMessage(null);
      setTxError(friendlyError(err));
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
    status === "eligible" && entry
      ? `${formatAmount(entry.amount)} ${symbol}`
      : null;

  const badgeStyles: Record<Status, string> = {
    loading: "bg-ghost text-muted",
    "not-connected": "bg-ghost text-muted",
    "not-started": "bg-violet-soft text-violet-deep",
    ended: "bg-ghost text-muted",
    claimed: "bg-green-100 text-green-700",
    eligible: "bg-green-100 text-green-700",
    "not-eligible": "bg-red-50 text-red-600",
  };

  const badgeText: Record<Status, string> = {
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

      {txError && (
        <p className="mt-2 rounded-lg bg-red-50 px-4 py-2.5 text-center text-xs font-medium text-red-600">
          {txError}
        </p>
      )}

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
