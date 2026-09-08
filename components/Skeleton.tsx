// Primitivas skeleton con shimmer (mismas medidas que el contenido real).
export function Shimmer({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`shimmer rounded-xl ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div aria-hidden className="shrink-0" style={{ flex: "0 0 160px" }}>
      <Shimmer className="w-full aspect-[2/3]" />
      <Shimmer className="h-3 mt-2 w-4/5" />
      <Shimmer className="h-2.5 mt-1.5 w-3/5" />
    </div>
  );
}

export function RailSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div aria-hidden className="mb-8">
      <Shimmer className="h-5 w-44 mb-3" />
      <div className="rail">
        {Array.from({ length: n }).map((_, k) => <CardSkeleton key={k} />)}
      </div>
    </div>
  );
}

export function GridSkeleton({ n = 12 }: { n?: number }) {
  return (
    <div aria-hidden className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: n }).map((_, k) => (
        <div key={k} className="min-w-0">
          <Shimmer className="w-full aspect-[2/3]" />
          <Shimmer className="h-3 mt-2 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div aria-hidden className="mb-8">
      <Shimmer className="h-5 w-44 mb-3" />
      <Shimmer className="w-full h-72 sm:h-80 md:h-[26rem]" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-hidden>
      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <Shimmer className="w-full max-w-[220px] aspect-[2/3] mx-auto md:mx-0" />
        <div>
          <Shimmer className="h-8 w-2/3" />
          <Shimmer className="h-3.5 w-1/2 mt-2" />
          <Shimmer className="h-3.5 w-full mt-4" />
          <Shimmer className="h-3.5 w-11/12 mt-2" />
          <Shimmer className="h-3.5 w-4/6 mt-2" />
          <div className="flex gap-2 mt-4">
            <Shimmer className="h-10 w-32" />
            <Shimmer className="h-10 w-28" />
          </div>
        </div>
      </div>
      <Shimmer className="h-5 w-44 mt-8 mb-3" />
      <div className="rail">
        {Array.from({ length: 6 }).map((_, k) => <CardSkeleton key={k} />)}
      </div>
    </div>
  );
}

export function PlayerSkeleton() {
  return (
    <div aria-hidden>
      <Shimmer className="h-7 w-2/3" />
      <Shimmer className="h-3 w-1/2 mt-2 mb-3" />
      <Shimmer className="w-full aspect-video" />
    </div>
  );
}
