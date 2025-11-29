import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trivia Night",
  description: "A fun trivia night game for friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

