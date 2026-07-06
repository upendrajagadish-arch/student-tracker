import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return <div className={cn("premium-skeleton", className)} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="premium-table-wrap space-y-3 p-4">
      <LoadingSkeleton className="h-10 w-full rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <LoadingSkeleton className="h-10 w-64 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <LoadingSkeleton className="h-64 rounded-2xl lg:col-span-2" />
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
