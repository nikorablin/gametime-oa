import { Brand } from "@/app/components/brand";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { checkoutService } from "@/lib/checkout/service";
import { formatEventDate } from "@/lib/checkout/format";

export default function CheckoutLoading() {
  const listing = checkoutService.getListing();

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-18 max-w-6xl items-center px-5 sm:px-8"><Brand /></div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Secure checkout</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Loading current ticket hold…</h1>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_25rem]">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
            <div className="flex gap-5">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white"><Ticket aria-hidden="true" className="size-6" /></div>
              <div><p className="text-sm font-bold text-orange-600">NBA · New York</p><h2 className="mt-1 text-2xl font-black tracking-tight">{listing.eventName}</h2></div>
            </div>
            <div className="mt-8 grid gap-5 text-sm sm:grid-cols-2">
              <div className="flex gap-3"><CalendarDays aria-hidden="true" className="size-5 text-zinc-400" /><span className="font-bold">{formatEventDate(listing.eventDate)}</span></div>
              <div className="flex gap-3"><MapPin aria-hidden="true" className="size-5 text-zinc-400" /><span className="font-bold">{listing.venue}</span></div>
            </div>
            <p className="mt-8 rounded-2xl bg-zinc-50 p-5 text-sm font-semibold text-zinc-600">{listing.section} · {listing.row} · {listing.quantity} tickets</p>
          </div>
          <div className="h-80 animate-pulse rounded-[2rem] bg-white shadow-xl shadow-black/5" aria-label="Loading current price and expiration" />
        </div>
      </main>
    </div>
  );
}
