import { HeroSkeleton, RailSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <HeroSkeleton />
      <RailSkeleton n={6} />
      <RailSkeleton n={6} />
      <RailSkeleton n={6} />
    </>
  );
}
