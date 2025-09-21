import { Inter, IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MERKL Airdrop",
  description:
    "Check your eligibility and claim AIR tokens via Merkle proof verification.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
