import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grimwick — Bones of the Failed Royal Wizard",
  description: "A 2D roguelike survival game about a skeleton necromancer with a cursed wand. Survive dungeon rooms, raise undead allies, collect souls, and become a powerful undead lord.",
  keywords: ["roguelike", "survival", "necromancer", "skeleton", "dungeon", "vampire survivors", "indie game"],
  authors: [{ name: "Grimwick" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Grimwick — Necromancer Roguelike",
    description: "Survive dungeon rooms, raise undead allies, collect souls.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grimwick",
    description: "A skeleton necromancer roguelike.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
