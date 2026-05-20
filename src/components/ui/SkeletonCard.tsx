export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="h-48 rounded-xl bg-zinc-800" />
      <div className="mt-4 h-4 w-2/3 rounded bg-zinc-800" />
      <div className="mt-2 h-3 w-1/2 rounded bg-zinc-800" />
      <div className="mt-4 h-8 rounded bg-zinc-800" />
    </div>
  );
}
