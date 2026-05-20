import { SkeletonCard } from "@/components/ui/SkeletonCard";

export default function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4 md:px-6">
      {Array.from({ length: 8 }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
}
