import Image from "next/image";
import { cn } from "@/lib/utils";

type SteamSignInButtonProps = {
  className?: string;
};

export function SteamSignInButton({ className }: SteamSignInButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center gap-2.5 rounded-lg bg-[#1B2838] px-4 text-sm font-medium text-white transition hover:bg-[#2A475E]",
        className,
      )}
    >
      <Image
        src="/steamlogo.svg"
        alt=""
        width={22}
        height={22}
        unoptimized
        className="shrink-0"
      />
      Sign in With Steam
    </button>
  );
}
