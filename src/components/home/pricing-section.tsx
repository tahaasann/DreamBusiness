"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Shield, CreditCard, Zap } from "lucide-react";

export default function PricingSection() {
    const t = useTranslations("Pricing");
    const [isAnnual, setIsAnnual] = useState<boolean>(true);

    return (
        <section
            id="pricing"
            className="py-16 text-center space-y-8 max-w-6xl mx-auto px-4 sm:px-6"
        >
            <div className="space-y-3 max-w-3xl mx-auto">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-3.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
                    {t("badge")}
                </span>

                <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-zinc-950 dark:text-white font-display">
                    {t("titleLine1")}{" "}
                    <span className="font-serif italic font-normal text-emerald-600 dark:text-emerald-400 pr-1">
                        {t("titleHighlight")}
                    </span>
                    {t("titleLine2")}
                </h2>

                <p className="text-zinc-700 dark:text-zinc-300 text-sm sm:text-base font-body max-w-xl mx-auto">
                    {t("subtitle")}
                </p>
            </div>

            <div className="inline-flex items-center gap-2 p-1.5 rounded-full liquid-glass-light border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                <button
                    onClick={() => setIsAnnual(false)}
                    className={`px-5 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                        !isAnnual
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                    }`}
                >
                    {t("monthlyBilling")}
                </button>
                <button
                    onClick={() => setIsAnnual(true)}
                    className={`px-5 py-2 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isAnnual
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                    }`}
                >
                    <span>{t("annualBilling")}</span>
                    <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 font-bold">
                        {t("saveBadge")}
                    </span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-4 text-left">
                <div className="liquid-glass-card p-8 rounded-3xl flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase font-semibold">
                                {t("starterTitle")}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                                {t("starterBadge")}
                            </span>
                        </div>

                        <div className="flex items-baseline gap-1">
                            <span className="font-display font-light text-5xl text-zinc-950 dark:text-white">
                                {isAnnual ? "$11.95" : "$14.95"}
                            </span>
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                {t("perMonth")}
                            </span>
                        </div>

                        <ul className="space-y-3 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-body">
                            <li className="flex items-center gap-2.5">
                                <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>1 Storefront Location</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Up to 300 AI Review Replies / mo</span>
                            </li>
                        </ul>
                    </div>

                    <Link
                        href="/login"
                        className="w-full py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white text-center font-semibold text-xs font-body hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors block"
                    >
                        {t("ctaFreeTrial")}
                    </Link>
                </div>

                {/* Pro Card */}
                <div className="liquid-glass-card p-8 rounded-3xl flex flex-col justify-between space-y-6 ring-2 ring-emerald-500 shadow-2xl relative bg-white/90 dark:bg-zinc-900/90">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-amber-500 to-amber-600 text-white font-mono text-[10px] uppercase font-bold tracking-wider px-4 py-1 rounded-full shadow-md">
                        {t("proPopular")}
                    </div>

                    <div className="space-y-4 pt-1">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-xs text-emerald-900 dark:text-emerald-300 font-bold uppercase">
                                {t("proTitle")}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
                                {t("proBadge")}
                            </span>
                        </div>

                        <div className="flex items-baseline gap-1">
                            <span className="font-display font-light text-5xl text-zinc-950 dark:text-white">
                                {isAnnual ? "$19.95" : "$29.95"}
                            </span>
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                {t("perMonth")}
                            </span>
                        </div>

                        <ul className="space-y-3 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-body">
                            <li className="flex items-center gap-2.5 font-bold">
                                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Unlimited Storefront Locations</span>
                            </li>
                            <li className="flex items-center gap-2.5 font-bold">
                                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Unlimited Gemini 3.5 AI Generations</span>
                            </li>
                            <li className="flex items-center gap-2.5 font-bold">
                                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>
                                    Local SEO Keyword Injection Pipeline
                                </span>
                            </li>
                        </ul>
                    </div>

                    <Link
                        href="/login"
                        className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white text-center font-bold text-xs font-body hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 block"
                    >
                        {t("ctaGetStarted")}
                    </Link>
                </div>

                <div className="liquid-glass-card p-8 rounded-3xl flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 uppercase font-semibold">
                                {t("agencyTitle")}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                                {t("agencyBadge")}
                            </span>
                        </div>

                        <div className="flex items-baseline gap-1">
                            <span className="font-display font-light text-5xl text-zinc-950 dark:text-white">
                                {isAnnual ? "$69.95" : "$79.95"}
                            </span>
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                {t("perMonth")}
                            </span>
                        </div>

                        <ul className="space-y-3 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-body">
                            <li className="flex items-center gap-2.5">
                                <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Multi-Client Account Management</span>
                            </li>
                        </ul>
                    </div>

                    <Link
                        href="/login"
                        className="w-full py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white text-center font-semibold text-xs font-body hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors block"
                    >
                        {t("ctaContactSales")}
                    </Link>
                </div>
            </div>

            <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                    <Shield className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("riskFree")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("noCreditCard")}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("apiCompliant")}</span>
                </div>
            </div>
        </section>
    );
}
