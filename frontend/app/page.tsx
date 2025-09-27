import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ClaimView } from "@/components/ClaimView";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <div className="pb-20">
          <ClaimView />
        </div>
      </main>
      <Footer />
    </div>
  );
}
