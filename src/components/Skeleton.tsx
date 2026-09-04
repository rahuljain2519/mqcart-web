export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line/60 ${className}`} />;
}

/** Placeholder grid that matches the product card layout. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="border border-line rounded-2xl bg-surface overflow-hidden"
        >
          <Skeleton className="aspect-square rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
