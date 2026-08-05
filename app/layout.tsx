import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthStatus from "@/components/AuthStatus";
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
  title: "마음 커넥트 | LA 한인 업체 추천 포탈",
  description: "단톡방에 쌓인 수년간의 추천을 검색 가능한 업체 디렉토리로.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <AuthStatus />
        {children}
      </body>
    </html>
  );
}
