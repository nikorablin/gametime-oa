import { Brand } from "@/app/components/brand";

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-18 max-w-6xl items-center px-5 sm:px-8"><Brand /></div>
      </header>
      <main className="mx-auto max-w-6xl animate-pulse px-5 py-12 sm:px-8">
        <div className="h-10 w-72 rounded-xl bg-zinc-200" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_25rem]">
          <div className="h-96 rounded-[2rem] bg-white" />
          <div className="h-96 rounded-[2rem] bg-white" />
        </div>
      </main>
    </div>
  );
}
