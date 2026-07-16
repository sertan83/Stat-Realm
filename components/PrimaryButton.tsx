import { cn } from "@/lib/utils";

export const PRIMARY_BUTTON_CLASSNAME =
  "rounded-full bg-[#E2363C] px-12 py-5 text-lg font-semibold tracking-wide text-white shadow-[0_0_40px_rgba(226,54,60,0.35)] transition hover:bg-[#F04449] hover:shadow-[0_0_50px_rgba(226,54,60,0.45)]";

type PrimaryButtonProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function PrimaryButton({ children, className, onClick }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(PRIMARY_BUTTON_CLASSNAME, className)}
    >
      {children}
    </button>
  );
}
