import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

// latin-ext is required for Turkish (ğ, ş, ı) and other accented characters.
const geist = Geist({
    subsets: ["latin", "latin-ext"],
    variable: "--font-geist",
    display: "swap",
});

const geistMono = Geist_Mono({
    subsets: ["latin", "latin-ext"],
    variable: "--font-geist-mono",
    display: "swap",
});

const instrumentSerif = Instrument_Serif({
    subsets: ["latin", "latin-ext"],
    weight: "400",
    style: ["normal", "italic"],
    variable: "--font-instrument",
    display: "swap",
});

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
        { media: "(prefers-color-scheme: dark)", color: "#0c0c0d" },
    ],
};

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta");
    const locale = await getLocale();

    return {
        title: {
            default: t("title"),
            template: "%s · Proficios",
        },
        description: t("description"),
        applicationName: "Proficios",
        keywords: [
            "Google Play review replies",
            "app review management",
            "AI review responder",
            "Play Console reviews",
            "app store optimization",
        ],
        openGraph: {
            title: t("title"),
            description: t("description"),
            siteName: "Proficios",
            locale: locale.replace("-", "_"),
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t("title"),
            description: t("description"),
        },
        icons: {
            icon: "/favicon.svg",
            shortcut: "/favicon.svg",
            apple: "/favicon.svg",
        },
    };
}

/**
 * Applies the saved (or system) theme before the first paint so the page
 * never flashes the wrong colours.
 */
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

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
            suppressHydrationWarning
            className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    {children}
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
