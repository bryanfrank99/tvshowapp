import { GridSkeleton } from "@/components/Skeleton";
import { Shimmer } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <Shimmer className="h-7 w-52 mb-4" />
      <GridSkeleton n={12} />
    </>
  );
}
