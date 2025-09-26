export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("User rejected") || msg.includes("user rejected")) {
    return "Transaction rejected in wallet";
  }
  const match = msg.match(
    /AlreadyClaimed|ZeroAmount|InvalidAccount|InvalidProof|ClaimNotStarted|ClaimEnded|TransferFailed/
  );
  if (match) {
    const map: Record<string, string> = {
      AlreadyClaimed: "This address has already claimed its tokens",
      ZeroAmount: "Claim amount is zero",
      InvalidAccount: "Invalid account",
      InvalidProof: "Merkle proof verification failed",
      ClaimNotStarted: "The claim window has not started yet",
      ClaimEnded: "The claim window has ended",
      TransferFailed: "Token transfer failed",
    };
    return map[match[0]];
  }
  return msg.split("\n")[0].slice(0, 200);
}
