"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__statrealm_empty__";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  variant?: "default" | "navbar";
  className?: string;
  name?: string;
};

function toInternalValue(value: string) {
  return value === "" ? EMPTY_VALUE : value;
}

function fromInternalValue(value: string) {
  return value === EMPTY_VALUE ? "" : value;
}

const triggerVariants = {
  default:
    "border-white/10 bg-white/5 backdrop-blur-md hover:border-white/20 focus:border-white/25",
  navbar:
    "border-white/10 bg-[#1B2838]/90 hover:bg-[#2A475E] focus:border-white/25",
} as const;

const sizeVariants = {
  sm: "h-9 py-1.5 pr-8 pl-3 text-sm",
  md: "h-11 px-4 text-sm",
} as const;

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
  size = "md",
  variant = "default",
  className,
  name,
}: SelectProps) {
  const internalValue = toInternalValue(value);
  const internalOptions = options.map((option) => ({
    ...option,
    value: toInternalValue(option.value),
  }));

  return (
    <SelectPrimitive.Root
      value={internalValue}
      onValueChange={(nextValue) => onValueChange(fromInternalValue(nextValue))}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group inline-flex w-full items-center justify-between gap-2 rounded-lg border font-medium text-white outline-none transition",
          "focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[placeholder]:text-white/55",
          triggerVariants[variant],
          sizeVariants[size],
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon
          aria-hidden="true"
          className="shrink-0 text-xs text-white/60 transition group-data-[state=open]:rotate-180"
        >
          ▼
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-50 overflow-hidden rounded-lg border border-white/10 bg-[#140B2D] text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md",
            "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]",
          )}
        >
          <SelectPrimitive.Viewport className="max-h-60 p-1">
            {internalOptions.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm text-white/90 outline-none",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  "data-[highlighted]:bg-white/10 data-[highlighted]:text-white",
                  "data-[state=checked]:bg-[#2A475E]/90 data-[state=checked]:text-white",
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
