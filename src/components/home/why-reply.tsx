import { useTranslations } from "next-intl";
import { ArrowUpRight, Bell, Eye, Bug } from "lucide-react";

const STAR_PATH =
    "M10 1.6l2.47 5.18 5.68.7-4.18 3.9 1.07 5.62L10 14.24 4.96 17l1.07-5.62L1.85 7.48l5.68-.7L10 1.6z";

const POINTS = [
    { key: "notified", Icon: Bell },
    { key: "visible", Icon: Eye },
    { key: "signal", Icon: Bug },
] as const;

export default function WhyReply() {
    const t = useTranslations("Why");

    return (
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-28 sm:px-8 md:grid-cols-[1fr_1.15fr] md:py-36">
            <div className="reveal">
                <p className="eyebrow">{t("eyebrow")}</p>
                <p className="mt-4 flex items-start font-display text-[clamp(6.5rem,17vw,11.5rem)] leading-[0.85] tracking-[-0.045em] text-ink">
                    +0.7
                    <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="ml-2 mt-[0.12em] size-[0.42em] fill-star"
                    >
                        <path d={STAR_PATH} />
                    </svg>
                </p>
                <p className="mt-5 max-w-sm text-[15.5px] leading-relaxed text-ink-2">{t("statLabel")}</p>
                <a
                    href="https://play.google.com/console/about/reviews/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-ink-3 underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
                >
                    {t("source")}
                    <ArrowUpRight className="size-3" />
                </a>
            </div>

            <div className="reveal">
                <h2 className="font-display text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[1.02] tracking-[-0.025em] text-ink">
                    {t("title")}
                </h2>
                <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-ink-2">{t("body")}</p>
                <ul className="mt-8 space-y-4">
                    {POINTS.map(({ key, Icon }) => (
                        <li key={key} className="flex gap-4">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-ink-2 shadow-xs ring-1 ring-line">
                                <Icon className="size-4" strokeWidth={1.75} />
                            </span>
                            <div>
                                <p className="text-[15px] font-semibold tracking-tight text-ink">
                                    {t(`${key}Title`)}
                                </p>
                                <p className="mt-0.5 text-[14px] leading-relaxed text-ink-3">{t(`${key}Body`)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
