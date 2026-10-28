"use client";

import { Button, Chip } from "@heroui/react";
import { ChevronDown, FlaskConical, TimerOff, TrendingUp } from "lucide-react";
import { useChangePrice, useExpireCheckout } from "@/lib/checkout/client";
import type { CheckoutView } from "@/lib/checkout/types";

export function ReviewerDrawer({ token, session }: { token: string; session: CheckoutView }) {
  const changePrice = useChangePrice(token);
  const expireCheckout = useExpireCheckout(token);
  const isTerminal = session.status === "COMPLETED" || session.status === "EXPIRED";
  const error = changePrice.error ?? expireCheckout.error;

  return (
    <details className="group mt-8 overflow-hidden rounded-2xl border border-dashed border-violet-300 bg-violet-50/70">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-bold text-violet-950 marker:hidden">
        <FlaskConical aria-hidden="true" className="size-4 text-violet-600" />
        Prototype controls
        <Chip className="ml-auto" size="sm" variant="soft">v{session.version} · {session.status.toLowerCase()}</Chip>
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-violet-200 px-4 py-4">
        <p className="mb-3 text-xs leading-5 text-violet-700">
          Simulate backend changes, then watch another open surface reconcile to the same session.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            size="sm"
            variant="outline"
            isDisabled={isTerminal || changePrice.isPending}
            onPress={() => changePrice.mutate(15)}
          >
            <TrendingUp aria-hidden="true" className="size-4" />
            {changePrice.isPending ? "Changing…" : "Raise price $15"}
          </Button>
          <Button
            size="sm"
            variant="danger-soft"
            isDisabled={isTerminal || expireCheckout.isPending}
            onPress={() => expireCheckout.mutate()}
          >
            <TimerOff aria-hidden="true" className="size-4" />
            {expireCheckout.isPending ? "Expiring…" : "Expire inventory"}
          </Button>
        </div>
        {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{error.message}</p>}
      </div>
    </details>
  );
}
