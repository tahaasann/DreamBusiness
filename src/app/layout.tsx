import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-body",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

export const viewport: Viewport = {
    themeColor: "#059669",
    width: "device-width",
    initialScale: 1,
};

export const metadata: Metadata = {
    title: "Proficios — Autonomous Local SEO Engine for Google Maps",
    description:
        "Auto-generate localized, Local-SEO-optimized Google Maps responses in sub-seconds. Zero AI hallucinations, 100% human-in-the-loop approval.",
    keywords: [
        "Local SEO",
        "Google Maps Engine",
        "Google Business Profile AI",
        "Review Management",
        "AI Review Auto Responder",
    ],
    authors: [{ name: "Proficios Team" }],
    openGraph: {
        title: "Proficios — Autonomous Local SEO Engine for Google Maps",
        description:
            "Auto-generate localized, Local-SEO-optimized Google Maps responses in sub-seconds.",
        url: "https://Proficios.com",
        siteName: "Proficios",
        locale: "en_US",
        type: "website",
    },
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
        apple: "/favicon.svg",
    },
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html
            lang={locale}
            className={`scroll-smooth ${inter.variable} ${jetbrainsMono.variable}`}
        >
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
