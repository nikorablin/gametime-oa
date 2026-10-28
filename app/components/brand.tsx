import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Gametime home">
      <span className="grid size-9 place-items-center rounded-xl bg-[#0a0a0a] text-xs font-black tracking-tight text-white shadow-sm">
        GT
      </span>
      <span className="text-lg font-extrabold tracking-[-0.04em] text-zinc-950">gametime</span>
    </Link>
  );
}
