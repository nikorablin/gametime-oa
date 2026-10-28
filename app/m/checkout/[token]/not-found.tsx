import { Smartphone } from "lucide-react";
import Link from "next/link";

export default function MobileCheckoutNotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-zinc-950 px-5">
      <main className="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-zinc-100"><Smartphone aria-hidden="true" className="size-7 text-zinc-500" /></div>
        <h1 className="mt-6 text-2xl font-black tracking-tight">Checkout link unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">Open the latest link from the web checkout or return to the event.</p>
        <Link href="/" className="mt-6 block rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white">Return to event</Link>
      </main>
    </div>
  );
}
