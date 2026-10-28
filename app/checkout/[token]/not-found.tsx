import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/app/components/brand";

export default function CheckoutNotFound() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-black/5 bg-white"><div className="mx-auto flex h-18 max-w-6xl items-center px-5 sm:px-8"><Brand /></div></header>
      <main className="mx-auto grid max-w-xl place-items-center px-5 py-24 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-zinc-200"><CircleHelp aria-hidden="true" className="size-7 text-zinc-600" /></div>
        <h1 className="mt-6 text-3xl font-black tracking-tight">Checkout link not found</h1>
        <p className="mt-3 leading-7 text-zinc-500">This link may be incomplete or no longer available. Return to the event to start a new checkout.</p>
        <Link href="/" className="mt-7 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white">Return to event</Link>
      </main>
    </div>
  );
}
