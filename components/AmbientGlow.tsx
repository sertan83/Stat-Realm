import { cn } from "@/lib/utils";

type AmbientGlowTone =
  | "blue"
  | "purple"
  | "magenta"
  | "red-purple"
  | "indigo";

type AmbientGlowProps = {
  tone: AmbientGlowTone;
  className?: string;
};

const toneClassNames: Record<AmbientGlowTone, string> = {
  blue: "statrealm-ambient-blue",
  purple: "statrealm-ambient-purple",
  magenta: "statrealm-ambient-magenta",
  "red-purple": "statrealm-ambient-red-purple",
  indigo: "statrealm-ambient-indigo",
};

export function AmbientGlow({ tone, className }: AmbientGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "statrealm-ambient-glow pointer-events-none absolute -z-0 rounded-full",
        toneClassNames[tone],
        className,
      )}
    />
  );
}
