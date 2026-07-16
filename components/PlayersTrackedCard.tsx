import { cn } from "@/lib/utils";

type PlayersTrackedCardProps = {
  count: number;
  className?: string;
};

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-white/55"
    >
      <path
        d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5 1.343 3.5 3 3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 13c1.657 0 3-1.567 3-3.5S9.657 6 8 6 5 7.567 5 9.5 6.343 13 8 13Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 15c-2.761 0-5 1.79-5 4v1h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16 13.5c2.485 0 4.5 1.62 4.5 3.625V19H14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlayersTrackedCard({
  count,
  className,
}: PlayersTrackedCardProps) {
  return (
    <aside
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:border-white/15",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <UsersIcon />
        <h3 className="text-sm font-semibold tracking-wide text-white sm:text-base">
          Players Tracked
        </h3>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">
        {count.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-white/55 sm:text-sm">
        Steam accounts synced
      </p>
    </aside>
  );
}
