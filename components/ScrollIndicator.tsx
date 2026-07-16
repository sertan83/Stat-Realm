import { cn } from "@/lib/utils";

type ScrollIndicatorProps = {
  className?: string;
};

export function ScrollIndicator({ className }: ScrollIndicatorProps) {
  return (
    <div
      className={cn("flex flex-col items-center gap-1 text-white/50", className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-8 w-8 animate-bounce"
      >
        <path
          d="M12 5V19M12 19L6 13M12 19L18 13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
