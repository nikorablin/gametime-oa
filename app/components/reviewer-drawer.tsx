"use client";

import { Button, Chip } from "@heroui/react";
import { Activity, ChevronDown, FlaskConical, TimerOff, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useChangePrice, useCheckoutAnalytics, useExpireCheckout } from "@/lib/checkout/client";
import { formatTime } from "@/lib/checkout/format";
import type { AnalyticsEventName, CheckoutView } from "@/lib/checkout/types";

const eventLabels: Record<AnalyticsEventName, string> = {
  SESSION_CREATED: "Session created",
  SESSION_RESUMED: "Session resumed",
  PRICE_CHANGED: "Price changed",
  PRICE_CHANGE_SHOWN: "Price update shown",
  PRICE_CHANGE_ACCEPTED: "New price accepted",
  SESSION_EXPIRED: "Inventory expired",
  COMPLETION_ATTEMPTED: "Completion attempted",
  ORDER_COMPLETED: "Order completed",
  DUPLICATE_COMPLETION_PREVENTED: "Duplicate prevented",
};

export function ReviewerDrawer({ token, session }: { token: string; session: CheckoutView }) {
  const [isOpen, setIsOpen] = useState(false);
  const changePrice = useChangePrice(token);
  const expireCheckout = useExpireCheckout(token);
  const analytics = useCheckoutAnalytics(token, isOpen);
  const isTerminal = session.status === "COMPLETED" || session.status === "EXPIRED";
  const error = changePrice.error ?? expireCheckout.error;

  return (
    <details
      className="group mt-8 overflow-hidden rounded-2xl border border-dashed border-violet-300 bg-violet-50/70"
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
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

        <div className="mt-5 border-t border-violet-200 pt-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-900">
            <Activity aria-hidden="true" className="size-4" />
            Continuity signals
          </div>
          {analytics.isPending ? (
            <p className="text-xs text-violet-700">Loading session events…</p>
          ) : analytics.error ? (
            <p role="alert" className="text-xs font-semibold text-red-700">{analytics.error.message}</p>
          ) : analytics.data ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Created", analytics.data.summary.sessionsCreated],
                  ["Cross-surface", analytics.data.summary.crossSurface],
                  ["Completed", analytics.data.summary.completed],
                  ["Expired", analytics.data.summary.expired],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/80 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">{label}</p>
                    <p className="mt-1 text-lg font-black text-violet-950">{value}</p>
                  </div>
                ))}
              </div>
              <ol className="mt-4 space-y-2" aria-label="Checkout session event timeline">
                {[...analytics.data.events].reverse().slice(0, 8).map((event) => (
                  <li key={event.id} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full bg-violet-500" />
                    <span className="min-w-0 flex-1 font-semibold text-violet-950">{eventLabels[event.name]}</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-600">{event.surface}</span>
                    <time className="text-violet-500" dateTime={event.at}>{formatTime(event.at)}</time>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>
      </div>
    </details>
  );
}
