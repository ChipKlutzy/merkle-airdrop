import { ConnectButton } from "./ConnectButton";

export function Navbar() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <a href="/" className="text-lg font-extrabold tracking-tight text-ink">
        MERKL
      </a>
      <ConnectButton />
    </header>
  );
}
