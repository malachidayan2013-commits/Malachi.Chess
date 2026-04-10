import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "אתר שחמט",
  description: "פרויקט שחמט של מלאכי"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
