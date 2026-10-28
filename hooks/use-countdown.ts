"use client";

import { useEffect, useState } from "react";

export function useCountdown(expiresAt: string, isEnabled = true) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>();

  useEffect(() => {
    if (!isEnabled) return;

    const update = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)),
      );
    };

    const initialTimer = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [expiresAt, isEnabled]);

  return isEnabled ? remainingSeconds : undefined;
}
