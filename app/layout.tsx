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
    "치지직 스트리머의 누적 방송 시간·팔로워를 추적하고, 1,000시간·1만 팔로워 마일스톤 돌파를 함께 축하하는 대시보드입니다.",
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
