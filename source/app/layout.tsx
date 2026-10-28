import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import "./gallery.css";
import "../../assets/about/navigation.css";
import "../../assets/i18n/language.css";
import "./language-layout.css";

export const metadata: Metadata = {
  title: "Candice Hong · Interaction & Visual Designer",
  description: "Candice (Yuxin) Hong’s portfolio. Explore interaction design, visual storytelling, computational art and original drawings alongside Dream Illustrator, Buzzing, Recall and Consistent.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
