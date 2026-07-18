"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAVBAR_HEIGHT_CLASS = "h-[55px]";

type NavbarFrameProps = {
  children: ReactNode;
};

export function NavbarFrame({ children }: NavbarFrameProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 0);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 left-0 z-40 transition-[background-color,backdrop-filter,box-shadow] duration-300 ease-out",
          isScrolled
            ? "bg-[#8C2F2F]/95 shadow-[0_4px_24px_rgba(0,0,0,0.18)] backdrop-blur-md"
            : "bg-[#8C2F2F]",
        )}
      >
        {children}
      </header>
      <div aria-hidden="true" className={cn(NAVBAR_HEIGHT_CLASS, "shrink-0")} />
    </>
  );
}
