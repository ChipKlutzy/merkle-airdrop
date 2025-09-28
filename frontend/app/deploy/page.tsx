import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DeployView } from "@/components/DeployView";

export default function DeployPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col px-6 pb-20 pt-10">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-ink">
            Launch an airdrop
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Deploy an ERC20 token, add claimants, and publish a Merkle-rooted
            airdrop — all in one flow.
          </p>
        </div>
        <DeployView />
      </main>
      <Footer />
    </div>
  );
}
