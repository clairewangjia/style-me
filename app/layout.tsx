import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Style Me — 个人形象 AI 分析",
  description: "上传一张照片，30 秒得到发型、色彩、穿搭、气质分析",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#faf7f2] text-zinc-900">
        {children}
      </body>
    </html>
  );
}
