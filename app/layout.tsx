import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { NavBar } from "@/components/nav-bar";
import { DesktopNav } from "@/components/desktop-nav";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunitoSans = Nunito_Sans({ variable: "--font-sans", subsets: ["latin"] });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paragone",
  description: "Scan your receipts & track your spending with zero effort",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang={locale} className={nunitoSans.variable}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/30 min-h-screen`}
        >
          <NextIntlClientProvider messages={messages}>
            <Providers>
              <div className="bg-noise" />
              <div className="relative flex flex-col min-h-screen">
                <DesktopNav />
                <main className={`flex-1 ${userId ? "pb-24 md:pb-0" : ""}`}>{children}</main>
                {userId && <NavBar />}
              </div>
              <Toaster />
            </Providers>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
