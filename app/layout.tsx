import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keywize",
  description: "Voice-first AI locksmith negotiator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
