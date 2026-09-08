import { RailSkeleton } from "@/components/Skeleton";
import { Shimmer } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Shimmer className="w-20 h-20 !rounded-full" />
        <Shimmer className="h-7 w-52" />
      </div>
      <RailSkeleton n={6} />
    </>
  );
}
