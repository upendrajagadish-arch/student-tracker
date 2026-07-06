import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import {
  APP_METADATA_DESCRIPTION,
  APP_METADATA_TITLE,
} from "@/lib/app-metadata";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: APP_METADATA_TITLE,
  description: APP_METADATA_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} min-h-full font-sans`}>{children}</body>
    </html>
  );
}
