import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ClaimCard } from "@/components/ClaimCard";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <div className="pb-20">
          <ClaimCard />
        </div>
      </main>
      <Footer />
    </div>
  );
}
