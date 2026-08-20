"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FaqAccordion() {
    const t = useTranslations("Faq");
    const [openFaqId, setOpenFaqId] = useState<number | null>(1);

    const faqs = [
        {
            id: 1,
            question:
                "Is proficios 100% compliant with Google Maps API policies?",
            answer: "Yes, absolutely. proficios connects directly via the official Google Business Profile API. We maintain strict compliance with Google's terms by enforcing 100% human-in-the-loop approval before any response is published to your public listing.",
        },
        {
            id: 2,
            question:
                "How does the Zero AI Hallucination Guardrail protect my brand?",
            answer: "Our engine uses deterministic fact-checking circuits locked to your verified business knowledge base (store hours, menu items, parking rules, refund policies). If a reviewer asks about something not in your knowledge base, proficios drafts a polite response inviting direct email contact rather than making up false facts.",
        },
        {
            id: 3,
            question:
                "How does Local SEO Keyword Injection improve my Google Maps rank?",
            answer: "Google's local search algorithm analyzes the terms used in review responses. proficios dynamically blends your target geo-keywords (e.g., 'Best Coffee in Downtown Austin') into responses naturally, signaling relevance to Google's Local Pack algorithm.",
        },
        {
            id: 4,
            question:
                "Can I manage multiple storefront locations under one proficios account?",
            answer: "Yes! Our Multi-Branch Tree Manager allows you to organize 1 to 500+ storefront locations with individual keyword pools, tone settings, and team permission roles.",
        },
        {
            id: 5,
            question: "Is there a long-term contract or can I cancel anytime?",
            answer: "There are zero long-term contracts or hidden cancellation fees. You can upgrade, downgrade, or cancel your subscription at any time with one click from your billing settings.",
        },
    ];

    return (
        <section
            id="faq"
            className="py-16 text-left space-y-8 max-w-4xl mx-auto px-4 sm:px-6"
        >
            <div className="text-center space-y-3">
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
            </div>

            <div className="space-y-4 pt-4">
                {faqs.map((faq) => (
                    <div
                        key={faq.id}
                        className="liquid-glass-card rounded-2xl overflow-hidden transition-all duration-300"
                    >
                        <button
                            onClick={() =>
                                setOpenFaqId(
                                    openFaqId === faq.id ? null : faq.id,
                                )
                            }
                            className="w-full p-6 text-left font-display font-medium text-base text-zinc-950 dark:text-white flex items-center justify-between gap-4 cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                <HelpCircle className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {faq.question}
                            </span>
                            <ChevronDown
                                className={`size-5 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform duration-300 ${
                                    openFaqId === faq.id ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {openFaqId === faq.id && (
                            <div className="px-6 pb-6 pt-0 text-xs text-zinc-700 dark:text-zinc-300 font-body leading-relaxed border-t border-zinc-100/80 dark:border-zinc-800/80">
                                <p className="pt-4">{faq.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
