"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useSyncExternalStore } from "react";
import { Globe } from "lucide-react";

const LANGUAGES = [
    { code: "en-US", label: "English (US)", flag: "🇺🇸" },
    { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
] as const;

const emptySubscribe = () => () => {};

// Isolated DOM mutation helper
function setLocaleCookie(newLocale: string): void {
    if (typeof document !== "undefined") {
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
}

// React 18/19 idiom: Safely detect client hydration
function useHydrated(): boolean {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );
}

// React 18/19 idiom: Safely read browser cookies
function useLocaleCookie(): string {
    return useSyncExternalStore(
        emptySubscribe,
        () => {
            if (typeof document === "undefined") return "en-US";
            const match = document.cookie
                .split("; ")
                .find((row) => row.startsWith("NEXT_LOCALE="));
            if (match) {
                const val = match.split("=")[1];
                if (val && LANGUAGES.some((l) => l.code === val)) {
                    return val;
                }
            }
            return "en-US";
        },
        () => "en-US",
    );
}

export default function LanguageSwitcher() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const isMounted = useHydrated();
    const cookieLocale = useLocaleCookie();
    const [selectedLocale, setSelectedLocale] = useState<string | null>(null);

    const currentLocale = selectedLocale || cookieLocale;

    const handleLanguageChange = (newLocale: string) => {
        setLocaleCookie(newLocale);
        setSelectedLocale(newLocale);
        setIsOpen(false);

        startTransition(() => {
            router.refresh();
        });
    };

    const selectedLang =
        LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0];

    if (!isMounted) {
        return (
            <div className="bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-2 opacity-80">
                <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>🇺🇸 English (US)</span>
            </div>
        );
    }

    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
                <Globe
                    className={`w-3.5 h-3.5 text-indigo-400 shrink-0 ${
                        isPending ? "animate-spin" : ""
                    }`}
                />
                <span>
                    {selectedLang.flag} {selectedLang.label}
                </span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-150">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-slate-800 transition cursor-pointer ${
                                lang.code === currentLocale
                                    ? "text-indigo-400 font-bold bg-slate-800/50"
                                    : "text-slate-300"
                            }`}
                        >
                            <span>{lang.flag}</span>
                            <span>{lang.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
