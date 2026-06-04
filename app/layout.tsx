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
  title: "치지직 방송 시간 마일스톤 트래커",
  description:
    "치지직 최고 스트리머들의 총 방송 시간 1,000시간 마일스톤 돌파를 기념하고 실시간으로 응원하는 공간입니다.",
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
