import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Food Redistribution & Expiration Tracking System",
  description: "A multi-paradigm database system to reduce food wastage and connect donors with food banks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Providers>
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
