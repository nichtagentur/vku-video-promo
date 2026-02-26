import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VKU Video Promo Generator",
  description: "Erstellen Sie kurze Promo-Videos fuer Web-Seminare von kommunaldigital.de",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased min-h-screen bg-white">
        {children}
      </body>
    </html>
  );
}
