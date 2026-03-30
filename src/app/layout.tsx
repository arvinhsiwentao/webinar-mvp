import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleTagManager } from '@next/third-parties/google'
import { GclidPreserver } from "@/components/analytics/GclidPreserver";
import { RouteChangeTracker } from "@/components/analytics/RouteChangeTracker";
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
  title: "Mike是麦克 - 在线直播",
  description: "Mike是麦克的专属直播间，分享北美华人生活与创业干货。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <GclidPreserver />
          <RouteChangeTracker />
        </Suspense>
        {children}
      </body>
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      )}
    </html>
  );
}
