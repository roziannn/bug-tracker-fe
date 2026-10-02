import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Providers } from "@/components/app/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IdleLogoutWatcher } from "@/components/app/idle-logout-watcher";
import { UserProvider } from "@/components/app/user-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bug Tracker",
    template: "Bug Tracker - %s",
  },
  description: "Bug tracker dashboard starter built with Next.js and shadcn/ui",
  icons: {
    icon: "/icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-background text-foreground"
      >
        <Providers>
          <UserProvider>
            <TooltipProvider>
              <IdleLogoutWatcher />
              {children}
            </TooltipProvider>
          </UserProvider>
        </Providers>
      </body>
    </html>
  );
}