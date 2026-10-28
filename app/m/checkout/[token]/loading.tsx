export default function MobileCheckoutLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 sm:py-8">
      <div className="mx-auto min-h-screen max-w-md animate-pulse bg-[#f7f7f5] p-4 sm:min-h-[calc(100vh-4rem)] sm:rounded-[2rem]">
        <div className="h-12 rounded-2xl bg-white" />
        <div className="mt-6 h-80 rounded-3xl bg-white" />
        <div className="mt-4 h-28 rounded-3xl bg-white" />
      </div>
    </div>
  );
}
