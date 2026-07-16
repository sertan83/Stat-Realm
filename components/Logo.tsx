import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        src="/logo.svg"
        alt="StatRealm"
        width={180}
        height={32}
        priority
        unoptimized
        className="h-8 w-auto"
      />
    </Link>
  );
}
