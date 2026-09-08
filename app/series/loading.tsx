import { GridSkeleton } from "@/components/Skeleton";
import { Shimmer } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <Shimmer className="h-6 w-40 mb-3" />
      <GridSkeleton n={12} />
    </>
  );
}
