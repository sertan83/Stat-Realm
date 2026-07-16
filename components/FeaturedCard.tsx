import Image from "next/image";
import Link from "next/link";
import type { WeeklyFeatured } from "@/data/featured";
import { cn } from "@/lib/utils";

type FeaturedCardProps = {
  featured: WeeklyFeatured;
  className?: string;
};

export function FeaturedCard({ featured, className }: FeaturedCardProps) {
  const { game, description } = featured;

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-6 shadow-[0_0_40px_rgba(107,47,214,0.12)] backdrop-blur-md transition duration-[250ms] hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(107,47,214,0.2)]",
        className,
      )}
    >
      <h3 className="text-lg font-semibold tracking-wide text-white sm:text-xl">
        🔥 Featured This Week
      </h3>

      <div className="relative mt-4 aspect-[460/215] overflow-hidden rounded-lg ring-1 ring-white/10">
        <Image
          src={game.imageUrl}
          alt={game.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <h4 className="mt-4 text-base font-semibold text-white sm:text-lg">
        {game.title}
      </h4>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/65 sm:text-base">
        {description}
      </p>

      <Link
        href="/explorer"
        className="mt-4 inline-flex w-fit items-center rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition duration-[250ms] hover:scale-[1.02] hover:bg-white/15 hover:shadow-[0_0_20px_rgba(226,54,60,0.2)]"
      >
        Explore →
      </Link>
    </article>
  );
}
