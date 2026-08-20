"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeSwitcher from "@/components/theme-switcher";
import HeroSection from "@/components/home/hero-section";
import MetricCards from "@/components/home/metric-cards";
import ConsoleStudio from "@/components/home/console-studio";
import BentoGrid from "@/components/home/bento-grid";
import PricingSection from "@/components/home/pricing-section";
import FaqAccordion from "@/components/home/faq-accordion";
import CtaFooter from "@/components/home/cta-footer";
import { ArrowRight, Sparkles } from "lucide-react";

const emptySubscribe = () => () => {};
function useHydrated() {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );
}

export default function Home() {
    const isMounted = useHydrated();
    const t = useTranslations("Nav");

    return (
        <div className="min-h-screen bg-canvas dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 relative selection:bg-emerald-500/20 selection:text-emerald-950 font-body overflow-x-hidden transition-colors duration-300">
            {/* Background Video Layer */}
            <div
                className="absolute inset-0 overflow-hidden z-0 pointer-events-none h-180"
                aria-hidden="true"
            >
                {isMounted && (
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="none"
                        className="w-full h-full object-cover opacity-45 dark:opacity-25 transition-opacity duration-700"
                    >
                        <source src="/hero-bg.mp4" type="video/mp4" />
                    </video>
                )}
                <div className="absolute inset-0 bg-radial from-transparent via-canvas/70 to-canvas dark:via-zinc-950/80 dark:to-zinc-950" />
                <div className="absolute inset-0 bg-linear-to-b from-canvas/30 via-canvas/80 to-canvas dark:from-zinc-950/30 dark:via-zinc-950/80 dark:to-zinc-950" />
            </div>

            {/* Navigation Bar */}
            <div className="fixed top-5 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
                <header className="pointer-events-auto max-w-5xl w-full h-14 rounded-full liquid-glass-light px-6 flex items-center justify-between shadow-lg">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-display font-semibold text-lg text-zinc-900 dark:text-white tracking-tight"
                    >
                        <div className="flex items-center gap-2 font-display font-bold">
                            <div className="size-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                                <Sparkles className="size-4" />
                            </div>
                            <span>proficios</span>
                        </div>
                    </Link>

                    <nav
                        className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-tight text-zinc-700 dark:text-zinc-300 font-body"
                        aria-label="Main Navigation"
                    >
                        <a
                            href="#dashboard"
                            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                            {t("consoleStudio")}
                        </a>
                        <a
                            href="#bento"
                            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                            {t("architecture")}
                        </a>
                        <a
                            href="#pricing"
                            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                            {t("pricing")}
                        </a>
                        <a
                            href="#faq"
                            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                            {t("faq")}
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <ThemeSwitcher />
                        <LanguageSwitcher />

                        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

                        <Link
                            href="/login"
                            className="hidden sm:block text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                        >
                            {t("signIn")}
                        </Link>

                        <Link
                            href="/login"
                            className="px-4.5 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs tracking-tight shadow-md shadow-emerald-600/20 hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 font-body"
                        >
                            <span>{t("getStarted")}</span>
                            <ArrowRight className="size-3.5" />
                        </Link>
                    </div>
                </header>
            </div>

            {/* Sections */}
            <HeroSection />
            <MetricCards />
            <ConsoleStudio />
            <BentoGrid />
            <PricingSection />
            <FaqAccordion />
            <CtaFooter />
        </div>
    );
}
