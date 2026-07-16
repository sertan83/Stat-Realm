export function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="statrealm-site-background pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="statrealm-bg-base absolute inset-0" />

      <div className="statrealm-bg-glow statrealm-bg-glow-top-left absolute -top-[24%] -left-[16%] h-[78%] w-[78%] rounded-full" />
      <div className="statrealm-bg-glow statrealm-bg-glow-top-right absolute -top-[18%] -right-[14%] h-[74%] w-[74%] rounded-full" />
      <div className="statrealm-bg-glow statrealm-bg-glow-hero absolute top-[6%] h-[56%] w-[min(94vw,1180px)] rounded-full" />
      <div className="statrealm-bg-glow statrealm-bg-glow-mid-left absolute top-[42%] -left-[12%] h-[58%] w-[58%] rounded-full" />
      <div className="statrealm-bg-glow statrealm-bg-glow-mid-right absolute top-[54%] -right-[10%] h-[62%] w-[62%] rounded-full" />
      <div className="statrealm-bg-glow statrealm-bg-glow-lower absolute top-[72%] left-[18%] h-[52%] w-[64%] rounded-full" />

      <div className="statrealm-bg-blob statrealm-bg-blob-one absolute top-[22%] left-[8%] h-[520px] w-[520px] rounded-full" />
      <div className="statrealm-bg-blob statrealm-bg-blob-two absolute top-[48%] right-[6%] h-[480px] w-[480px] rounded-full" />
      <div className="statrealm-bg-blob statrealm-bg-blob-three absolute top-[68%] left-[42%] h-[560px] w-[560px] rounded-full" />
      <div className="statrealm-bg-blob statrealm-bg-blob-four absolute top-[82%] right-[22%] h-[440px] w-[440px] rounded-full" />

      <div className="statrealm-bg-grid absolute inset-0" />
      <div className="statrealm-bg-noise absolute inset-0" />
      <div className="statrealm-bg-vignette absolute inset-0" />
    </div>
  );
}
