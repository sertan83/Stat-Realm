"use client";

import Image from "next/image";
import { useEffect } from "react";
import { signInWithSteam } from "@/app/actions/auth";

const FEATURES = [
  "Personal Dashboard",
  "Achievement Tracking",
  "Global Leaderboards",
] as const;

type AuthRequiredModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthRequiredModal({ isOpen, onClose }: AuthRequiredModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close sign in required dialog"
        className="statrealm-modal-backdrop absolute inset-0 bg-[#140B2D]/80 backdrop-blur-xl"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-required-title"
        aria-describedby="auth-required-description"
        className="statrealm-modal-panel relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#ffffff10] bg-[linear-gradient(160deg,#241445_0%,#1B2838_48%,#140B2D_100%)] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.55),0_0_60px_rgba(107,47,214,0.18)] sm:p-9"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <Image
              src="/steamlogo.svg"
              alt=""
              width={44}
              height={44}
              unoptimized
              className="h-11 w-11 shrink-0"
            />
          </div>

          <h2
            id="auth-required-title"
            className="mt-7 text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]"
          >
            Sign in with Steam
          </h2>
          <p
            id="auth-required-description"
            className="mt-4 max-w-[420px] text-sm leading-relaxed text-white/65 sm:text-[0.95rem]"
          >
            Connect your Steam account to unlock your personal dashboard,
            achievements, playtime analytics, leaderboards, and detailed game
            statistics.
          </p>

          <ul className="mt-6 w-full space-y-3 text-left">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-sm text-white/55"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs text-[#8FD3FF]"
                >
                  ✓
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 space-y-3">
          <form action={signInWithSteam}>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#1B2838] px-5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition duration-200 hover:bg-[#2A475E] hover:shadow-[0_0_32px_rgba(102,192,244,0.38),0_12px_32px_rgba(0,0,0,0.32)]"
            >
              <Image
                src="/steamlogo.svg"
                alt=""
                width={22}
                height={22}
                unoptimized
                className="shrink-0"
              />
              Sign in with Steam
            </button>
          </form>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-transparent px-4 text-sm font-medium text-white/55 transition hover:border-white/10 hover:bg-white/5 hover:text-white/80"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
