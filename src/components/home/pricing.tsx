import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

// Prices follow the plan table in the market-selection report (USD, monthly).
const PLANS = [
    { key: "free", price: 0, features: 4, featured: false },
    { key: "indie", price: 19, features: 4, featured: true },
    { key: "studio", price: 49, features: 4, featured: false },
    { key: "agency", price: 149, features: 4, featured: false },
] as const;

export default function Pricing() {
    const t = useTranslations("Pricing");

    return (
        <section id="pricing" className="scroll-mt-16 border-y border-line bg-subtle/60 py-28 md:py-32">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <div className="reveal mx-auto max-w-2xl text-center">
                    <p className="eyebrow">{t("eyebrow")}</p>
                    <h2 className="mt-4 font-display text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[1.02] tracking-[-0.025em] text-ink">
                        {t("title")}
                    </h2>
                    <p className="mt-4 text-[16.5px] leading-relaxed text-ink-2">{t("subtitle")}</p>
                </div>

                <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.key}
                            className={cn(
                                "reveal relative flex flex-col rounded-[1.25rem] p-6",
                                plan.featured
                                    ? "bg-inverse text-inverse-ink shadow-float"
                                    : "bg-surface shadow-card ring-1 ring-line",
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-[15px] font-semibold tracking-tight">{t(`${plan.key}.name`)}</h3>
                                {plan.featured && (
                                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">
                                        {t("popular")}
                                    </span>
                                )}
                            </div>
                            <p
                                className={cn(
                                    "mt-1.5 min-h-10 text-[13.5px] leading-snug",
                                    plan.featured ? "text-inverse-2" : "text-ink-3",
                                )}
                            >
                                {t(`${plan.key}.desc`)}
                            </p>

                            <div className="mt-6 flex items-baseline gap-1.5">
                                <span className="font-display text-[3.4rem] leading-none tracking-[-0.03em]">
                                    ${plan.price}
                                </span>
                                <span className={cn("text-[13px]", plan.featured ? "text-inverse-2" : "text-ink-3")}>
                                    {t("perMonth")}
                                </span>
                            </div>

                            <Link
                                href="/login?mode=signup"
                                className={cn(
                                    "btn mt-6 w-full",
                                    plan.featured ? "btn-accent" : "btn-secondary",
                                )}
                            >
                                {t(`${plan.key}.cta`)}
                            </Link>

                            <ul
                                className={cn(
                                    "mt-6 space-y-2.5 border-t pt-6 text-[13.5px]",
                                    plan.featured ? "border-white/10 dark:border-black/10" : "border-line",
                                )}
                            >
                                {Array.from({ length: plan.features }, (_, i) => (
                                    <li key={i} className="flex gap-2.5">
                                        <Check
                                            className={cn(
                                                "mt-0.5 size-4 shrink-0",
                                                plan.featured ? "text-accent-inverse" : "text-ok",
                                            )}
                                            strokeWidth={2.25}
                                        />
                                        <span className={plan.featured ? "text-inverse-ink" : "text-ink-2"}>
                                            {t(`${plan.key}.f${i + 1}`)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-center text-[13px] text-ink-3">{t("footnote")}</p>
            </div>
        </section>
    );
}
