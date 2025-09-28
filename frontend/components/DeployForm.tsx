"use client";

import { useMemo, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { deployContract, waitForTransactionReceipt } from "wagmi/actions";
import { isAddress, formatUnits } from "viem";
import artifacts from "@/lib/artifacts.json";
import { airdropAbi } from "@/lib/abi";
import { TARGET_CHAIN_ID, EXPLORER, config } from "@/lib/wagmi";
import { buildMerkleTree, parseClaimants, type MerkleResult } from "@/lib/merkle";
import { saveAirdrop } from "@/lib/airdrop-store";
import { friendlyError } from "@/lib/errors";
import { ChainGuard } from "@/components/ChainGuard";
import { CopyAddress } from "@/components/CopyAddress";

type TokenState = { address: `0x${string}`; name: string; symbol: string };

const inputCls =
  "w-full rounded-full border border-card-border bg-white px-5 py-3 text-sm text-ink placeholder:text-muted focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/10";
const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-muted";
const btnPrimary =
  "w-full rounded-full bg-violet px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-deep disabled:cursor-not-allowed disabled:opacity-40";

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function DeployStep({ onDeployed }: { onDeployed: (t: TokenState) => void }) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  async function deploy() {
    if (!name || !symbol || !address) return;
    setError(null);
    setBusy(true);
    try {
      const hash = await deployContract(config, {
        abi: artifacts.mockToken.abi as never,
        bytecode: artifacts.mockToken.bytecode as `0x${string}`,
        args: [name, symbol],
        account: address,
        chainId: TARGET_CHAIN_ID,
      });
      const receipt = await waitForTransactionReceipt(config, { hash });
      if (receipt.contractAddress) {
        onDeployed({ address: receipt.contractAddress, name, symbol });
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Token name</label>
        <input
          className={inputCls}
          placeholder="Merkl Token"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>Symbol</label>
        <input
          className={inputCls}
          placeholder="MERK"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button className={btnPrimary} disabled={!name || !symbol || busy} onClick={deploy}>
        {busy ? "Deploying…" : "Deploy Token"}
      </button>
    </div>
  );
}

export function DeployForm() {
  const { address } = useAccount();
  const [token, setToken] = useState<TokenState | null>(null);
  const [claimStart, setClaimStart] = useState("");
  const [claimEnd, setClaimEnd] = useState("");
  const [rawList, setRawList] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [tree, setTree] = useState<MerkleResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [airdropAddress, setAirdropAddress] = useState<`0x${string}` | null>(null);
  const [defaultsSet, setDefaultsSet] = useState(false);
  const { writeContractAsync } = useWriteContract();

  function fillWindowDefaults() {
    if (defaultsSet || claimStart || claimEnd) return;
    const now = new Date();
    setClaimStart(toLocalInput(now));
    setClaimEnd(toLocalInput(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)));
    setDefaultsSet(true);
  }

  const merkle = useMemo(() => {
    if (!rawList.trim()) return null;
    try {
      const parsed = parseClaimants(rawList);
      const result = buildMerkleTree(parsed);
      setListError(null);
      return result;
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Invalid list");
      return null;
    }
  }, [rawList]);

  const canDeploy =
    token && merkle && claimStart && claimEnd &&
    Math.floor(new Date(claimStart).getTime() / 1000) <
      Math.floor(new Date(claimEnd).getTime() / 1000);

  async function deployAirdrop() {
    if (!token || !merkle || !address) return;
    setError(null);
    setBusy(true);
    try {
      const start = Math.floor(new Date(claimStart).getTime() / 1000);
      const end = Math.floor(new Date(claimEnd).getTime() / 1000);

      const hash = await deployContract(config, {
        abi: artifacts.airdrop.abi as never,
        bytecode: artifacts.airdrop.bytecode as `0x${string}`,
        args: [token.address, merkle.root, BigInt(start), BigInt(end)],
        account: address,
        chainId: TARGET_CHAIN_ID,
      });
      const receipt = await waitForTransactionReceipt(config, { hash });
      if (!receipt.contractAddress) throw new Error("Deployment failed");
      const addr = receipt.contractAddress;

      const fundHash = await writeContractAsync({
        address: token.address,
        abi: [
          {
            type: "function",
            name: "transfer",
            stateMutability: "nonpayable",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ] as const,
        functionName: "transfer",
        args: [addr, merkle.total],
        chainId: TARGET_CHAIN_ID,
      });
      await waitForTransactionReceipt(config, { hash: fundHash });

      saveAirdrop(
        {
          address: addr,
          token: token.address,
          tokenName: token.name,
          tokenSymbol: token.symbol,
          merkleRoot: merkle.root,
          claimStart: start,
          claimEnd: end,
          createdAt: Date.now(),
        },
        merkle.claims
      );
      setAirdropAddress(addr);
      setTree(merkle);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (airdropAddress && token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-card-border bg-white px-8 py-10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-1.5 text-xs font-semibold text-green-700">
          Airdrop deployed
        </span>

        <div className="mt-5 flex flex-col gap-3 text-left">
          <div className="rounded-xl bg-ghost px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Token — {token.name} ({token.symbol})
            </p>
            <p className="mt-1.5 break-all font-mono text-xs text-ink">
              {token.address}
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <CopyAddress address={token.address} />
              {EXPLORER && (
                <a
                  className="text-xs font-medium text-violet underline"
                  href={`${EXPLORER}/address/${token.address}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on explorer
                </a>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-ghost px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Airdrop contract
            </p>
            <p className="mt-1.5 break-all font-mono text-xs text-ink">
              {airdropAddress}
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <CopyAddress address={airdropAddress} />
              {EXPLORER && (
                <a
                  className="text-xs font-medium text-violet underline"
                  href={`${EXPLORER}/address/${airdropAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on explorer
                </a>
              )}
            </div>
          </div>
        </div>

        <a
          href={`/?airdrop=${airdropAddress}`}
          className="mt-6 inline-block rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white hover:bg-violet-deep"
        >
          Go to claim page →
        </a>
      </div>
    );
  }

  return (
    <ChainGuard>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="rounded-2xl border border-card-border bg-white px-8 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            1 · Deploy your token
          </h2>
          {token ? (
            <div className="mt-4 rounded-xl bg-ghost px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">
                  {token.name} ({token.symbol})
                </span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                  Deployed
                </span>
              </div>
              <p className="mt-1.5 break-all font-mono text-xs text-muted">
                {token.address}
              </p>
              <div className="mt-2">
                <CopyAddress address={token.address} />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <DeployStep onDeployed={setToken} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-card-border bg-white px-8 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            2 · Claim window
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Starts</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={claimStart}
                onChange={(e) => setClaimStart(e.target.value)}
                onFocus={fillWindowDefaults}
              />
            </div>
            <div>
              <label className={labelCls}>Ends</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={claimEnd}
                onChange={(e) => setClaimEnd(e.target.value)}
                onFocus={fillWindowDefaults}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Tap either field to auto-fill: starts now, ends in 30 days.
          </p>
        </div>

        <div className="rounded-2xl border border-card-border bg-white px-8 py-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            3 · Claimants
          </h2>
          <p className="mt-2 text-xs text-muted">
            One per line: <span className="font-mono">address, amount</span>
          </p>
          <textarea
            className="mt-3 h-32 w-full resize-none rounded-xl border border-card-border bg-white p-4 font-mono text-xs text-ink placeholder:text-muted focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/10"
            placeholder={"0x7099...79C8, 100\n0x3C44...93BC, 200"}
            value={rawList}
            onChange={(e) => setRawList(e.target.value)}
          />
          {listError && <p className="mt-2 text-xs text-red-600">{listError}</p>}
          {merkle && (
            <div className="mt-3 rounded-xl bg-ghost px-4 py-3 text-xs text-muted">
              <p>
                <span className="font-semibold text-ink">
                  {Object.keys(merkle.claims).length}
                </span>{" "}
                recipients · total{" "}
                <span className="font-semibold text-ink">
                  {formatUnits(merkle.total, 18)}
                </span>{" "}
                {token?.symbol ?? "tokens"}
              </p>
              <p className="mt-1 truncate font-mono">
                root {merkle.root}
              </p>
            </div>
          )}
        </div>

        {error && <p className="text-center text-xs text-red-600">{error}</p>}

        <button className={btnPrimary} disabled={!canDeploy || busy} onClick={deployAirdrop}>
          {busy
            ? "Deploying & funding…"
            : "Deploy Airdrop Contract"}
        </button>

        <p className="text-center text-xs leading-relaxed text-muted">
          Deploys a new Airdrop contract owned by your wallet and funds it with
          the total allocation.
        </p>
      </div>
    </ChainGuard>
  );
}
