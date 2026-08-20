"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Zap, ArrowRight, CheckCircle2, ShieldCheck, Cpu } from "lucide-react";

export default function HeroSection() {
    const t = useTranslations("Hero");

    return (
        <section className="relative z-10 pt-36 px-4 sm:px-6 max-w-6xl mx-auto text-center space-y-8 animate-fade-in-up">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold backdrop-blur-md shadow-2xs">
                <Zap className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t("badge")}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-7xl font-light tracking-tight text-zinc-950 dark:text-white font-display leading-[1.08]">
                {t("titleLine1")}{" "}
                <span className="font-serif italic font-normal text-emerald-600 dark:text-emerald-400 pr-2">
                    {t("titleHighlight")}
                </span>
                {t("titleLine2")}
            </h1>

            <p className="text-zinc-700 dark:text-zinc-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto font-body">
                {t("subtitle")}
            </p>

            {/* Authentic Architecture Trust Ribbon */}
            <div className="pt-2 pb-4">
                <div className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 px-6 py-3 rounded-2xl liquid-glass-light border border-zinc-200/80 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-zinc-900 dark:text-white">
                            Google Business API
                        </span>
                        <span>Official Integration</span>
                    </div>

                    <div className="hidden sm:block text-zinc-300 dark:text-zinc-700">
                        •
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Cpu className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-zinc-900 dark:text-white">
                            Google Gemini Integrated
                        </span>
                        <span>Sub-300ms AI</span>
                    </div>

                    <div className="hidden sm:block text-zinc-300 dark:text-zinc-700">
                        •
                    </div>

                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-zinc-900 dark:text-white">
                            100% Human Control
                        </span>
                        <span>One-Click Approval</span>
                    </div>
                </div>
            </div>

            <div className="pt-2 flex justify-center">
                <Link
                    href="/login"
                    className="px-8 py-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-sm tracking-tight shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 dark:hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-body"
                >
                    <span>{t("startTrial")}</span>
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </section>
    );
}
