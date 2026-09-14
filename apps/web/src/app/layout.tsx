import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "shrimp",
  description: "Shrimp sidebar multi-bot chat shell",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body className="h-full overflow-hidden antialiased">{children}</body>
    </html>
  );
}
