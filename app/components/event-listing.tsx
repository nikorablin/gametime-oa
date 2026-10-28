"use client";

import { Card, Chip } from "@heroui/react";
import { CalendarDays, MapPin, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import type { Listing } from "@/lib/checkout/types";
import { formatCurrency, formatEventDate } from "@/lib/checkout/format";
import { Brand } from "./brand";
import { CreateCheckoutButton } from "./create-checkout-button";

export function EventListing({ listing }: { listing: Listing }) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <ShieldCheck aria-hidden="true" className="size-4 text-emerald-600" />
            Secure checkout
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-18">
        <div className="mb-10 max-w-2xl">
          <Chip color="accent" variant="soft" size="sm">
            <Sparkles aria-hidden="true" className="mr-1 size-3.5" />
            Great seats, right on time
          </Chip>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
            Your next great night starts here.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600">
            Two seats at the Garden. Reserve them now and pick up on any device.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-[2rem] bg-[#111] text-white shadow-2xl shadow-black/10">
            <div className="relative min-h-80 overflow-hidden p-7 sm:p-10">
              <div className="absolute -right-12 -top-16 size-72 rounded-full border-[42px] border-orange-500/80" />
              <div className="absolute -bottom-24 right-36 size-64 rounded-full bg-blue-600/70 blur-sm" />
              <div className="relative flex h-full min-h-64 flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-white/60">Featured matchup</span>
                  <Ticket aria-hidden="true" className="size-6 text-white/70" />
                </div>
                <div>
                  <p className="mb-3 text-sm font-bold text-orange-400">NBA · New York</p>
                  <h2 className="max-w-2xl text-3xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">{listing.eventName}</h2>
                </div>
              </div>
            </div>
            <div className="grid gap-4 border-t border-white/10 bg-white/5 px-7 py-6 text-sm sm:grid-cols-2 sm:px-10">
              <div className="flex items-center gap-3"><CalendarDays aria-hidden="true" className="size-5 text-orange-400" /><span className="font-semibold">{formatEventDate(listing.eventDate)}</span></div>
              <div className="flex items-center gap-3"><MapPin aria-hidden="true" className="size-5 text-orange-400" /><span className="font-semibold">{listing.venue}</span></div>
            </div>
          </div>

          <Card className="rounded-[2rem] border border-black/6 bg-white p-2 shadow-xl shadow-black/5">
            <Card.Header className="block px-5 pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Your seats</p>
              <Card.Title className="mt-2 text-2xl font-extrabold tracking-tight">{listing.section} · {listing.row}</Card.Title>
              <Card.Description className="mt-1 text-zinc-500">{listing.quantity} tickets together</Card.Description>
            </Card.Header>
            <Card.Content className="px-5 py-6">
              <div className="flex items-end justify-between border-y border-zinc-100 py-5">
                <span className="text-sm font-semibold text-zinc-500">Price per ticket</span>
                <span className="text-3xl font-black tracking-tight">{formatCurrency(listing.unitPrice)}</span>
              </div>
              <div className="mt-5"><CreateCheckoutButton listingId={listing.id} /></div>
            </Card.Content>
            <Card.Footer className="justify-center px-5 pb-5 text-center text-xs leading-5 text-zinc-400">Tickets are reserved for 10 minutes after you continue.</Card.Footer>
          </Card>
        </div>
      </main>
    </div>
  );
}
