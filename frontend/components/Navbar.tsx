"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";

const links = [
  { href: "/", label: "Claim" },
  { href: "/deploy", label: "Deploy" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
          MERKL
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                pathname === link.href
                  ? "bg-violet-soft text-violet-deep"
                  : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <ConnectButton />
    </header>
  );
}
