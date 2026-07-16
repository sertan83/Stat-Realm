import type { Stat } from "@/types/stat";
import { cn } from "@/lib/utils";

type StatsRowProps = {
  stats: Stat[];
  className?: string;
};

export function StatsRow({ stats, className }: StatsRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-16 gap-y-4",
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {stat.value}
          </p>
          <p className="mt-1 text-base font-medium tracking-wide text-white/60 uppercase">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
