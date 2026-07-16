import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <main className="min-h-screen text-white">
      <Navbar />

      <div className="flex min-h-[calc(100vh-55px)] flex-col items-center justify-center px-4 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#EFA5A8] uppercase">
          404
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
          This StatRealm profile does not exist or has not been synced yet.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-full bg-[#E2363C] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#F04449]"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
