"use client";

import { Button } from "@heroui/react";
import { Check, Copy, LockKeyhole, RefreshCw, Smartphone } from "lucide-react";
import { useRef, useState } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { useAcceptPrice, useCompleteCheckout } from "@/lib/checkout/client";
import { formatTime } from "@/lib/checkout/format";
import type { CheckoutView } from "@/lib/checkout/types";

export function CheckoutActions({
  token,
  session,
}: {
  token: string;
  session: CheckoutView;
}) {
  const [copied, setCopied] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const acceptPrice = useAcceptPrice(token);
  const completeCheckout = useCompleteCheckout(token);
  const isWorking = acceptPrice.isPending || completeCheckout.isPending;
  const error = acceptPrice.error ?? completeCheckout.error;
  const remaining = useCountdown(
    session.expiresAt,
    session.status !== "COMPLETED" && session.status !== "EXPIRED",
  );

  async function copyMobileLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${session.links.mobile}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const minutes = remaining === undefined ? undefined : Math.floor(remaining / 60);
  const seconds = remaining === undefined ? undefined : remaining % 60;

  return (
    <div className="space-y-4">
      {session.status !== "COMPLETED" && session.status !== "EXPIRED" && (
        <div className="flex items-center justify-between rounded-2xl bg-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
            <RefreshCw aria-hidden="true" className="size-4" />
            Tickets held until {formatTime(session.expiresAt)}
          </div>
          <span className="min-w-14 text-right font-mono text-sm font-bold tabular-nums text-zinc-950">
            {remaining === undefined
              ? "--:--"
              : `${minutes}:${seconds!.toString().padStart(2, "0")}`}
          </span>
        </div>
      )}

      {session.status === "PRICE_CONFIRMATION_REQUIRED" && session.pendingPriceVersion && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isDisabled={isWorking}
          onPress={() => acceptPrice.mutate(session.pendingPriceVersion!)}
        >
          {isWorking ? "Updating…" : "Accept new price"}
        </Button>
      )}

      {session.status === "ACTIVE" && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          isDisabled={isWorking}
          onPress={() => {
            idempotencyKey.current ??= crypto.randomUUID();
            completeCheckout.mutate(idempotencyKey.current);
          }}
        >
          <LockKeyhole aria-hidden="true" className="size-4" />
          {isWorking ? "Completing order…" : "Complete purchase"}
        </Button>
      )}

      {(session.status === "ACTIVE" || session.status === "PRICE_CONFIRMATION_REQUIRED") && (
        <Button variant="outline" fullWidth onPress={copyMobileLink}>
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? "Mobile link copied" : "Copy mobile resume link"}
          <Smartphone aria-hidden="true" className="ml-auto size-4 text-zinc-400" />
        </Button>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error.message} The session will refresh automatically.
        </p>
      )}
    </div>
  );
}
