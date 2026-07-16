import type { DetailMetric } from "@/types/game-details";

type MetricGridProps = {
  metrics: DetailMetric[];
};

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:border-white/15 hover:shadow-[0_0_30px_rgba(107,47,214,0.16)]"
        >
          <p className="text-2xl font-bold text-white sm:text-3xl">
            {metric.value}
          </p>
          <p className="mt-2 text-sm text-white/55">{metric.label}</p>
        </article>
      ))}
    </div>
  );
}
