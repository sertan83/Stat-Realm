import Image from "next/image";
import { AmbientGlow } from "@/components/AmbientGlow";

const INSTAGRAM_URL = "https://instagram.com/statrealm";
const EMAIL_URL = "mailto:statrealmgg@gmail.com";

const contactLinkClassName =
  "inline-flex items-center gap-2.5 text-sm font-medium text-white/80 transition hover:text-white";

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M4 7.5 12 13l8-5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 px-4 py-8 lg:px-6">
      <AmbientGlow
        tone="indigo"
        className="top-[20%] left-1/2 h-[min(68vw,560px)] w-[min(96vw,1100px)]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl justify-center md:justify-start">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-center">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <p className="text-xs text-white/45">Follow us on Instagram</p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={contactLinkClassName}
            >
              <Image
                src="/insta.svg"
                alt="Instagram"
                width={20}
                height={20}
                unoptimized
                className="h-5 w-5 shrink-0"
              />
              <span>@statrealm</span>
            </a>
          </div>

          <div
            aria-hidden="true"
            className="hidden h-10 w-px shrink-0 bg-white/10 md:mx-[70px] md:block"
          />

          <div className="flex flex-col items-center gap-2 md:items-start">
            <p className="text-xs text-white/45">Reach us</p>
            <a href={EMAIL_URL} className={contactLinkClassName}>
              <MailIcon />
              <span>statrealmgg@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
