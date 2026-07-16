type SectionHeadingProps = {
  eyebrow: string;
  title: string;
};

export function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#EFA5A8] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}
