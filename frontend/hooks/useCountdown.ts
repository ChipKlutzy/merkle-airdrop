"use client";

import { useEffect, useState } from "react";

function parts(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function useCountdown(target: bigint | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (target === undefined) return;
    const targetMs = Number(target) * 1000;
    const tick = () => setRemainingMs(targetMs - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (target === undefined || remainingMs === null) return null;
  return { expired: remainingMs <= 0, ...parts(remainingMs) };
}
