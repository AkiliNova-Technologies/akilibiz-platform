import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AkiliBiz Business",
  description: "Manage your business with AkiliBiz.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-UG">
      <body>{children}</body>
    </html>
  );
}
