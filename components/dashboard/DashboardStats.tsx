import type { DashboardMetric } from "@/types/dashboard";

type DashboardStatsProps = {
  metrics: DashboardMetric[];
};

export function DashboardStats({ metrics }: DashboardStatsProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white sm:text-3xl">
        Profile Statistics
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:border-white/15 hover:shadow-[0_0_30px_rgba(107,47,214,0.16)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-white sm:text-3xl">
                  {metric.value}
                </p>
                <h3 className="mt-2 text-sm font-medium text-white/70">
                  {metric.label}
                </h3>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#EFA5A8] ring-1 ring-white/10">
                {metric.icon}
              </span>
            </div>
            <p className="mt-4 text-xs text-white/40">{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
