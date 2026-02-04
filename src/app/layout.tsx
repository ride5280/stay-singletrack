import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stay Singletrack - Colorado Trail Conditions",
  description: "AI-powered trail condition predictions for Colorado trails. Know if trails are good to go before you head out.",
  keywords: ["trail conditions", "Colorado", "hiking", "running", "mountain biking", "trail status"],
  metadataBase: new URL('https://stay-singletrack.vercel.app'),
  openGraph: {
    title: "Stay Singletrack",
    description: "AI-powered trail condition predictions for Colorado trails",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stay Singletrack",
    description: "AI-powered trail condition predictions for Colorado trails",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider>
          <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <Header />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
