"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Award, ArrowRight, Sparkles } from "lucide-react";

export default function CtaFooter() {
    const t = useTranslations("CtaFooter");

    return (
        <>
            <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
                <div className="liquid-glass-card rounded-3xl p-10 sm:p-14 text-center space-y-6 relative overflow-hidden ring-2 ring-emerald-500/30 bg-linear-to-b from-white/90 to-emerald-50/40 dark:from-zinc-900/90 dark:to-emerald-950/20">
                    <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                        <Award className="size-6" />
                    </div>

                    <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-zinc-950 dark:text-white font-display leading-[1.1]">
                        {t("titleLine1")} <br />
                        <span className="font-serif italic font-normal text-emerald-600 dark:text-emerald-400">
                            {t("titleHighlight")}
                        </span>
                    </h2>

                    <p className="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base font-body max-w-xl mx-auto">
                        {t("subtitle")}
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/login"
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-sm tracking-tight shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 dark:hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 font-body"
                        >
                            <span>{t("startTrialBtn")}</span>
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <footer className="border-t border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl relative z-10 font-body text-xs text-zinc-600 dark:text-zinc-400 py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 font-display font-bold text-zinc-900 dark:text-white text-sm">
                            <div className="size-6 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                                <Sparkles className="size-3.5" />
                            </div>
                            <span>proficios</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                            {t("copyright")}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{t("apiStatus")}</span>
                    </div>

                    <div className="flex items-center gap-6 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        <a
                            href="#"
                            className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                            {t("privacy")}
                        </a>
                        <a
                            href="#"
                            className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                            {t("terms")}
                        </a>
                        <a
                            href="#"
                            className="hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                            {t("security")}
                        </a>
                    </div>
                </div>
            </footer>
        </>
    );
}
