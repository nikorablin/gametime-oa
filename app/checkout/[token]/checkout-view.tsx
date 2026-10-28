"use client";

import { Alert, Card, Chip } from "@heroui/react";
import { AlertTriangle, CalendarDays, CheckCircle2, CircleX, MapPin, ShieldCheck, Ticket } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/app/components/brand";
import { useCheckoutSession } from "@/lib/checkout/client";
import { formatCurrency, formatEventDate } from "@/lib/checkout/format";
import type { CheckoutView as CheckoutViewModel } from "@/lib/checkout/types";
import { CheckoutActions } from "./checkout-actions";

function StatusAlert({ session }: { session: CheckoutViewModel }) {
  if (session.status === "PRICE_CONFIRMATION_REQUIRED") {
    return (
      <Alert status="warning">
        <Alert.Indicator><AlertTriangle aria-hidden="true" className="size-5" /></Alert.Indicator>
        <Alert.Content><Alert.Title>The price changed while you were away</Alert.Title><Alert.Description>Review the new total below. We will not charge you until you accept it.</Alert.Description></Alert.Content>
      </Alert>
    );
  }
  if (session.status === "EXPIRED") {
    return (
      <Alert status="danger">
        <Alert.Indicator><CircleX aria-hidden="true" className="size-5" /></Alert.Indicator>
        <Alert.Content><Alert.Title>These tickets are no longer held</Alert.Title><Alert.Description>Your checkout expired. Return to the event to reserve currently available seats.</Alert.Description></Alert.Content>
      </Alert>
    );
  }
  if (session.status === "COMPLETED") {
    return (
      <Alert status="success">
        <Alert.Indicator><CheckCircle2 aria-hidden="true" className="size-5" /></Alert.Indicator>
        <Alert.Content><Alert.Title>You are going to the game</Alert.Title><Alert.Description>Order {session.orderId} is confirmed. Both devices will show this same order.</Alert.Description></Alert.Content>
      </Alert>
    );
  }
  return null;
}

export function CheckoutView({ token, initialSession }: { token: string; initialSession: CheckoutViewModel }) {
  const { data: session } = useCheckoutSession(token, initialSession);
  const displayTotal = session.listing.pendingTotal ?? session.listing.total;

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500"><ShieldCheck aria-hidden="true" className="size-4 text-emerald-600" />Secure checkout</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Checkout session</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">Review and complete</h1></div>
          <Chip color={session.status === "COMPLETED" ? "success" : session.status === "EXPIRED" ? "danger" : "default"} variant="soft">
            {session.status === "ACTIVE" ? "Tickets reserved" : session.status.replaceAll("_", " ").toLowerCase()}
          </Chip>
        </div>

        <div className="mb-6"><StatusAlert session={session} /></div>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_25rem]">
          <Card className="rounded-[2rem] border border-black/6 bg-white shadow-xl shadow-black/5">
            <Card.Header className="border-b border-zinc-100 p-6 sm:p-8">
              <div className="flex gap-5">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white"><Ticket aria-hidden="true" className="size-6" /></div>
                <div><p className="text-sm font-bold text-orange-600">NBA · New York</p><Card.Title className="mt-1 text-2xl font-black tracking-[-0.035em]">{session.listing.eventName}</Card.Title></div>
              </div>
            </Card.Header>
            <Card.Content className="p-6 sm:p-8">
              <div className="grid gap-5 text-sm sm:grid-cols-2">
                <div className="flex gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 size-5 text-zinc-400" /><div><p className="text-zinc-400">Date and time</p><p className="mt-1 font-bold">{formatEventDate(session.listing.eventDate)}</p></div></div>
                <div className="flex gap-3"><MapPin aria-hidden="true" className="mt-0.5 size-5 text-zinc-400" /><div><p className="text-zinc-400">Venue</p><p className="mt-1 font-bold">{session.listing.venue}</p></div></div>
              </div>
              <div className="mt-8 grid grid-cols-3 rounded-2xl bg-zinc-50 p-5 text-center">
                <div><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Section</p><p className="mt-2 font-extrabold">{session.listing.section.replace("Section ", "")}</p></div>
                <div className="border-x border-zinc-200"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Row</p><p className="mt-2 font-extrabold">{session.listing.row.replace("Row ", "")}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tickets</p><p className="mt-2 font-extrabold">{session.listing.quantity}</p></div>
              </div>
            </Card.Content>
          </Card>

          <Card className="rounded-[2rem] border border-black/6 bg-white shadow-xl shadow-black/5">
            <Card.Header className="px-6 pt-6"><Card.Title className="text-xl font-extrabold">Order summary</Card.Title></Card.Header>
            <Card.Content className="px-6 py-5">
              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-zinc-600"><span>{session.listing.quantity} tickets</span><span>{formatCurrency(session.listing.total)}</span></div>
                <div className="flex justify-between text-zinc-600"><span>Estimated fees</span><span>Included</span></div>
                <div className="border-t border-zinc-100 pt-4">
                  {session.listing.pendingTotal !== undefined && <div className="mb-1 flex justify-between text-zinc-400 line-through"><span>Previous total</span><span>{formatCurrency(session.listing.total)}</span></div>}
                  <div className="flex items-end justify-between"><span className="font-bold">Total</span><span className="text-3xl font-black tracking-tight">{formatCurrency(displayTotal)}</span></div>
                </div>
              </div>
              {session.status !== "EXPIRED" && session.status !== "COMPLETED" && <p className="mt-3 text-xs leading-5 text-zinc-400">No payment is collected in this prototype.</p>}
            </Card.Content>
            <Card.Footer className="block px-6 pb-6">
              {session.status === "EXPIRED" ? (
                <Link href="/" className="block rounded-xl bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-white">Find available tickets</Link>
              ) : session.status === "COMPLETED" ? (
                <Link href="/" className="block rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-bold">Back to event</Link>
              ) : (
                <CheckoutActions token={token} session={session} />
              )}
            </Card.Footer>
          </Card>
        </div>
      </main>
    </div>
  );
}
