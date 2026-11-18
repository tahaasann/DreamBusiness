"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const TONES = ["professional", "friendly", "apologetic", "casual"] as const;
type Tone = (typeof TONES)[number];

/** Same review, four voices. Lets visitors feel the tone control. */
export default function ToneShowcase() {
    const t = useTranslations("Features");
    const tTone = useTranslations("Tones");
    const [tone, setTone] = useState<Tone>("friendly");

    return (
        <div className="flex h-full flex-col gap-4">
            <div
                role="radiogroup"
                aria-label={t("toneTitle")}
                className="inline-flex w-full rounded-xl bg-subtle p-1 ring-1 ring-line"
            >
                {TONES.map((item) => (
                    <button
                        key={item}
                        type="button"
                        role="radio"
                        aria-checked={tone === item}
                        onClick={() => setTone(item)}
                        className={cn(
                            "flex-1 rounded-[0.6rem] px-2 py-1.5 text-[12px] font-medium transition-all",
                            tone === item
                                ? "bg-surface text-ink shadow-card ring-1 ring-line"
                                : "text-ink-3 hover:text-ink",
                        )}
                    >
                        {tTone(item)}
                    </button>
                ))}
            </div>
            <div className="relative flex-1 rounded-xl bg-subtle p-4 ring-1 ring-line">
                <p className="eyebrow mb-2">{t("toneReplyLabel")}</p>
                <p key={tone} className="animate-fade font-display text-[19px] leading-snug text-ink">
                    {t(`toneSample.${tone}`)}
                </p>
            </div>
        </div>
    );
}
