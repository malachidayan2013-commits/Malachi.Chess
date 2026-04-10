import "./globals.css";

export const metadata = {
  title: "Malachi Chess",
  description: "משחק שחמט אונליין",
  icons: {
    icon: "/chess.ico",
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