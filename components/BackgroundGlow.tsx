type BackgroundGlowProps = {
  variant?: "default" | "hero";
};

export function BackgroundGlow({ variant = "default" }: BackgroundGlowProps) {
  if (variant !== "hero") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="statrealm-hero-title-glow absolute top-[12%] left-1/2 h-[min(52vw,560px)] w-[min(88vw,920px)] rounded-full" />
    </div>
  );
}
