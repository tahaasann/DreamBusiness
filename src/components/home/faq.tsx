import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

const QUESTION_COUNT = 8;

export default function Faq() {
    const t = useTranslations("Faq");

    return (
        <section id="faq" className="scroll-mt-16 py-28 md:py-36">
            <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr]">
                <div className="reveal md:sticky md:top-28 md:self-start">
                    <p className="eyebrow">{t("eyebrow")}</p>
                    <h2 className="mt-4 font-display text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[1.02] tracking-[-0.025em] text-ink">
                        {t("title")}
                    </h2>
                    <p className="mt-4 max-w-sm text-[15.5px] leading-relaxed text-ink-2">{t("subtitle")}</p>
                </div>

                <div className="reveal divide-y divide-line border-y border-line">
                    {Array.from({ length: QUESTION_COUNT }, (_, i) => (
                        // `name` makes the accordion exclusive in supporting browsers.
                        <details key={i} name="faq" className="faq-item group" open={i === 0}>
                            <summary className="flex list-none items-center justify-between gap-6 py-5 text-left text-[16px] font-medium tracking-tight text-ink transition-colors hover:text-accent">
                                {t(`q${i + 1}`)}
                                <span className="grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-line transition-all duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-canvas group-open:ring-ink">
                                    <Plus className="size-3.5" strokeWidth={2} />
                                </span>
                            </summary>
                            <p className="pb-6 pr-12 text-[15px] leading-relaxed text-ink-2">{t(`a${i + 1}`)}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
