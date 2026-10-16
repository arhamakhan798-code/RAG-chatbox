import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ash — TechMart AI Support",
  description: "Ash is TechMart's official customer support AI assistant powered by Qdrant Vector Search and Google Gemini.",
  icons: {
    icon: "/ash-logo.png",
    shortcut: "/ash-logo.png",
    apple: "/ash-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/ash-logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
