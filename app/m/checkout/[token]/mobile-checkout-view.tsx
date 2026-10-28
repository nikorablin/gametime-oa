"use client";

import { Alert, Card, Chip } from "@heroui/react";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, CircleX, MapPin, ShieldCheck, Ticket } from "lucide-react";
import Link from "next/link";
import { CheckoutActions } from "@/app/checkout/[token]/checkout-actions";
import { ReviewerDrawer } from "@/app/components/reviewer-drawer";
import { formatCurrency, formatEventDate } from "@/lib/checkout/format";
import { useCheckoutSession } from "@/lib/checkout/client";
import type { CheckoutView } from "@/lib/checkout/types";

function RecoveryState({ session }: { session: CheckoutView }) {
  if (session.status === "PRICE_CONFIRMATION_REQUIRED") {
    return (
      <Alert status="warning">
        <Alert.Indicator><AlertTriangle aria-hidden="true" className="size-5" /></Alert.Indicator>
        <Alert.Content><Alert.Title>Price update</Alert.Title><Alert.Description>The price changed on another surface. Accept the new total to continue.</Alert.Description></Alert.Content>
      </Alert>
    );
  }
  if (session.status === "EXPIRED") {
    return (
      <Alert status="danger">
        <Alert.Indicator><CircleX aria-hidden="true" className="size-5" /></Alert.Indicator>
        <Alert.Content><Alert.Title>Hold expired</Alert.Title><Alert.Description>These seats were released. Return to the event to see current inventory.</Alert.Description></Alert.Content>
      </Alert>
    );
  }
  if (session.status === "COMPLETED") {
    return (
      <Alert status="success">
        <Alert.Indicator><CheckCircle2 aria-hidden="true" className="size-5" /></Alert.Indicator>
        <Alert.Content><Alert.Title>Order confirmed</Alert.Title><Alert.Description>{session.orderId} is the same order shown on web.</Alert.Description></Alert.Content>
      </Alert>
    );
  }
  return null;
}

export function MobileCheckoutView({ token, initialSession }: { token: string; initialSession: CheckoutView }) {
  const { data: session } = useCheckoutSession(token, initialSession, "mobile");
  const total = session.listing.pendingTotal ?? session.listing.total;
  const isTerminal = session.status === "EXPIRED" || session.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-zinc-950 py-0 sm:py-8">
      <div className="mx-auto min-h-screen max-w-md overflow-hidden bg-[#f7f7f5] shadow-2xl sm:min-h-[calc(100vh-4rem)] sm:rounded-[2rem]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-black/5 bg-white/95 px-4 backdrop-blur">
          <Link href={session.links.web} aria-label="Open web checkout" className="grid size-9 place-items-center rounded-full bg-zinc-100"><ChevronLeft aria-hidden="true" className="size-5" /></Link>
          <div className="text-center"><p className="text-sm font-extrabold tracking-tight">Checkout</p><p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Gametime app</p></div>
          <ShieldCheck aria-hidden="true" className="size-5 text-emerald-600" />
        </header>

        <main className="px-4 pb-56 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <Chip size="sm" color={session.status === "COMPLETED" ? "success" : session.status === "EXPIRED" ? "danger" : "default"} variant="soft">
              {session.status === "ACTIVE" ? "Tickets reserved" : session.status.replaceAll("_", " ").toLowerCase()}
            </Chip>
            <span className="text-xs font-semibold text-zinc-400">Session v{session.version}</span>
          </div>

          <div className="mb-4"><RecoveryState session={session} /></div>

          <Card className="overflow-hidden rounded-3xl border border-black/6 bg-white shadow-lg shadow-black/5">
            <div className="relative h-36 overflow-hidden bg-zinc-950 p-5 text-white">
              <div className="absolute -right-8 -top-10 size-40 rounded-full border-[24px] border-orange-500/80" />
              <div className="relative flex h-full flex-col justify-between">
                <Ticket aria-hidden="true" className="size-5 text-white/60" />
                <h1 className="max-w-xs text-xl font-black leading-tight tracking-[-0.035em]">{session.listing.eventName}</h1>
              </div>
            </div>
            <Card.Content className="space-y-4 p-5 text-sm">
              <div className="flex gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 text-orange-600" /><div><p className="text-zinc-400">Date and time</p><p className="mt-0.5 font-bold">{formatEventDate(session.listing.eventDate)}</p></div></div>
              <div className="flex gap-3"><MapPin aria-hidden="true" className="mt-0.5 size-4 text-orange-600" /><div><p className="text-zinc-400">Venue</p><p className="mt-0.5 font-bold">{session.listing.venue}</p></div></div>
              <div className="grid grid-cols-3 rounded-2xl bg-zinc-50 p-4 text-center">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Section</p><p className="mt-1 font-extrabold">{session.listing.section.replace("Section ", "")}</p></div>
                <div className="border-x border-zinc-200"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Row</p><p className="mt-1 font-extrabold">{session.listing.row.replace("Row ", "")}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Qty</p><p className="mt-1 font-extrabold">{session.listing.quantity}</p></div>
              </div>
            </Card.Content>
          </Card>

          <div className="mt-4 rounded-3xl bg-white p-5 shadow-lg shadow-black/5">
            <div className="flex items-end justify-between">
              <div><p className="text-sm text-zinc-500">Order total</p>{session.listing.pendingTotal !== undefined && <p className="mt-1 text-xs text-zinc-400 line-through">Was {formatCurrency(session.listing.total)}</p>}</div>
              <p className="text-3xl font-black tracking-tight">{formatCurrency(total)}</p>
            </div>
          </div>

          <ReviewerDrawer token={token} session={session} />
        </main>

        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-black/5 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:bottom-8 sm:rounded-b-[2rem]">
          {isTerminal ? (
            <Link href="/" className="block rounded-xl bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-white">{session.status === "EXPIRED" ? "Find new tickets" : "Back to event"}</Link>
          ) : (
            <CheckoutActions token={token} session={session} surface="mobile" showMobileLink={false} />
          )}
        </div>
      </div>
    </div>
  );
}
