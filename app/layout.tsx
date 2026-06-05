import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chzzk-milestone-tracker.vercel.app"),
  title: "CHZZK Creator Milestones",
  description:
    "치지직 크리에이터의 누적 방송 시간, 팔로워 성장, 생일과 데뷔 기념일까지 한눈에 확인할 수 있는 마일스톤 대시보드입니다.",
  verification: {
    google: "3NG6ANGF43yASYHh7gQbtAjMSbga1Vcd_S21vS-VbcU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
