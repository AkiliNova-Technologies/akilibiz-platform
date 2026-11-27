import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { I18nProvider } from "@/components/akilibiz/i18n/i18n-provider";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "AkiliBiz Business",
  description: "Manage your business with AkiliBiz.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale } = await getI18n();
  return (
    <html className={`${inter.variable} ${sora.variable}`} lang={locale}>
      <body>
        <ThemeProvider>
          <I18nProvider initialLocale={locale}>
            <TooltipProvider>{children}</TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
