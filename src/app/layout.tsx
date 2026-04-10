import "./globals.css";

export const metadata = {
  title: "Malachi Chess",
  description: "משחק שחמט אונליין",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he">
      <body>{children}</body>
    </html>
  );
}