import "./globals.css";

export const metadata = {
  title: "אתר שחמט",
  description: "משחק שחמט אונליין"
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