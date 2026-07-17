"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { logOut } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";

type UserAccountDropdownProps = {
  displayName: string;
  avatarUrl?: string | null;
};

const menuItemClassName =
  "flex w-full items-center px-3 py-2 text-left text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-white";

export function UserAccountDropdown({
  displayName,
  avatarUrl,
}: UserAccountDropdownProps) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-9 shrink-0 items-center gap-2.5 rounded-lg bg-[#1B2838] px-3 text-sm font-medium text-white transition duration-[250ms] hover:scale-[1.02] hover:bg-[#2A475E]"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={tAuth("steamAvatarAlt", { name: displayName })}
            width={26}
            height={26}
            className="h-[26px] w-[26px] rounded-full object-cover ring-1 ring-white/20"
          />
        ) : null}
        <span className="whitespace-nowrap">{displayName}</span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t("accountMenu")}
          className="statrealm-account-dropdown absolute top-[calc(100%+8px)] right-0 z-50 min-w-[168px] overflow-hidden rounded-lg border border-white/10 bg-[#1B2838] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        >
          <Link
            href="/dashboard"
            role="menuitem"
            className={menuItemClassName}
            onClick={() => setIsOpen(false)}
          >
            {t("profile")}
          </Link>
          <div
            aria-hidden="true"
            className="my-1 border-t border-white/10"
          />
          <form action={logOut}>
            <button type="submit" role="menuitem" className={menuItemClassName}>
              {t("logOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
