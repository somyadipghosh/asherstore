import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/components/layout/AppProviders";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const headingFont = Bebas_Neue({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASHER STORE | Premium Football Jersey Store",
  description:
    "ASHER STORE brings modern football jersey shopping with AI recommendations, smart sizing, and premium UX.",
  manifest: "/pictures/site.webmanifest",
  icons: {
    icon: [
      { url: "/pictures/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/pictures/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/pictures/favicon.ico" },
    ],
    shortcut: "/pictures/favicon.ico",
    apple: "/pictures/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(cookieStore.get("asherstore-session")?.value);

  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        <AppProviders hasSessionCookie={hasSessionCookie}>
          <Navbar />
          <main className="flex min-h-[calc(100vh-73px)] flex-col">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
