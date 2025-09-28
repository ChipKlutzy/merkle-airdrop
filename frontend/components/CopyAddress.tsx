"use client";

import { useState } from "react";

export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy address"
      className="inline-flex items-center rounded-full border border-card-border px-3 py-1 text-xs font-medium text-muted transition hover:border-violet hover:text-violet"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
