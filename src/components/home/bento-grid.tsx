"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Sliders, ShieldCheck, Globe2, GitBranch, X, Lock } from "lucide-react";

export default function BentoGrid() {
    const t = useTranslations("BentoGrid");
    const [bentoKeywords, setBentoKeywords] = useState<string[]>([
        "Best Coffee Austin",
        "Free WiFi",
        "Artisan Bakery",
    ]);
    const [newKeywordInput, setNewKeywordInput] = useState<string>("");
    const [bentoLang, setBentoLang] = useState<
        "EN" | "ES" | "DE" | "PT" | "TR"
    >("EN");

    const handleAddBentoKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            newKeywordInput.trim() &&
            !bentoKeywords.includes(newKeywordInput.trim())
        ) {
            setBentoKeywords([...bentoKeywords, newKeywordInput.trim()]);
            setNewKeywordInput("");
        }
    };

    return (
        <section
            id="bento"
            className="py-16 text-left space-y-8 max-w-6xl mx-auto px-4 sm:px-6"
        >
            <div className="text-center space-y-3 max-w-3xl mx-auto">
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
                {/* Card 1 */}
                <div className="lg:col-span-7 liquid-glass-card p-8 rounded-3xl space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Sliders className="size-5" />
                            </div>
                            <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
                                {t("card1BoostBadge")}
                            </span>
                        </div>

                        <h3 className="font-display font-light text-2xl text-zinc-950 dark:text-white">
                            {t("card1Title")}
                        </h3>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-body leading-relaxed max-w-md">
                            {t("card1Desc")}
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                        <form
                            onSubmit={handleAddBentoKeyword}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                placeholder="Type target keyword..."
                                value={newKeywordInput}
                                onChange={(e) =>
                                    setNewKeywordInput(e.target.value)
                                }
                                className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1.5 bg-emerald-600 text-white font-mono text-xs rounded-xl font-bold hover:bg-emerald-500 cursor-pointer"
                            >
                                Inject
                            </button>
                        </form>

                        <div className="flex flex-wrap gap-1.5">
                            {bentoKeywords.map((kw) => (
                                <span
                                    key={kw}
                                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 font-bold"
                                >
                                    ✓ {kw}
                                    <button
                                        onClick={() =>
                                            setBentoKeywords(
                                                bentoKeywords.filter(
                                                    (k) => k !== kw,
                                                ),
                                            )
                                        }
                                        className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 cursor-pointer"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="lg:col-span-5 liquid-glass-card p-8 rounded-3xl space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="size-5" />
                            </div>
                            <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 font-bold">
                                {t("card2LockBadge")}
                            </span>
                        </div>

                        <h3 className="font-display font-light text-2xl text-zinc-950 dark:text-white">
                            {t("card2Title")}
                        </h3>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-body leading-relaxed">
                            {t("card2Desc")}
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5 font-mono text-xs">
                        <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300">
                            <span className="flex items-center gap-2">
                                <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                                Store Hours Lock
                            </span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                                VERIFIED
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300">
                            <span className="flex items-center gap-2">
                                <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                                Menu Prices Lock
                            </span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                                VERIFIED
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300">
                            <span className="flex items-center gap-2">
                                <Lock className="size-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                                Valet & Parking Rules
                            </span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                                VERIFIED
                            </span>
                        </div>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="lg:col-span-5 liquid-glass-card p-8 rounded-3xl space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Globe2 className="size-5" />
                        </div>

                        <h3 className="font-display font-light text-2xl text-zinc-950 dark:text-white">
                            {t("card3Title")}
                        </h3>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-body leading-relaxed">
                            {t("card3Desc")}
                        </p>
                    </div>

                    <div className="flex gap-1.5 font-mono text-xs">
                        {(["EN", "ES", "DE", "PT", "TR"] as const).map(
                            (lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setBentoLang(lang)}
                                    className={`flex-1 py-2 text-center rounded-xl border transition-all cursor-pointer ${
                                        bentoLang === lang
                                            ? "bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs"
                                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                                    }`}
                                >
                                    {lang}
                                </button>
                            ),
                        )}
                    </div>
                </div>

                {/* Card 4 */}
                <div className="lg:col-span-7 liquid-glass-card p-8 rounded-3xl space-y-6 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <GitBranch className="size-5" />
                            </div>
                            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                                {t("card4BranchesBadge")}
                            </span>
                        </div>

                        <h3 className="font-display font-light text-2xl text-zinc-950 dark:text-white">
                            {t("card4Title")}
                        </h3>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-body leading-relaxed max-w-md">
                            {t("card4Desc")}
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 font-mono text-xs space-y-2">
                        <div className="text-zinc-500 dark:text-zinc-400">
                            ├── 🏢 org-proficios-group-tx
                        </div>
                        <div className="pl-4 text-emerald-800 dark:text-emerald-300 font-bold flex justify-between items-center">
                            <span>├── 📍 branch-austin-downtown</span>
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                                42 PENDING
                            </span>
                        </div>
                        <div className="pl-4 text-zinc-600 dark:text-zinc-400 flex justify-between items-center">
                            <span>├── 📍 branch-miami-southbeach</span>
                            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                                18 PENDING
                            </span>
                        </div>
                        <div className="pl-4 text-zinc-600 dark:text-zinc-400 flex justify-between items-center">
                            <span>└── 📍 branch-berlin-mitte</span>
                            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                                29 PENDING
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
