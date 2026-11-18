import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import ReplyDemo from "@/components/home/reply-demo";

export default function Hero() {
    const t = useTranslations("Hero");

    return (
        <section className="relative isolate overflow-hidden pb-8 pt-32 sm:pt-40">
            <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]"
            >
                <div className="hairline-grid absolute inset-0 opacity-60" />
                <div className="absolute left-1/2 top-[-14rem] h-[40rem] w-[70rem] max-w-[160vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_15%,transparent),transparent)]" />
                <div className="absolute right-[-10rem] top-[22rem] hidden h-[28rem] w-[28rem] sm:block rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--star)_14%,transparent),transparent)]" />
                <div className="grain absolute inset-0" />
            </div>

            <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
                <a
                    href="#how"
                    className="animate-rise group inline-flex items-center gap-2.5 rounded-full bg-surface/80 py-1 pl-1 pr-3.5 text-[12.5px] font-medium text-ink-2 shadow-xs ring-1 ring-line backdrop-blur transition hover:ring-line-strong"
                >
                    <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-canvas">
                        {t("eyebrowTag")}
                    </span>
                    {t("eyebrow")}
                    <ArrowRight className="size-3.5 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                </a>

                <h1
                    className="animate-rise mx-auto mt-7 max-w-4xl font-display text-[clamp(2.9rem,7.4vw,6rem)] leading-[0.98] tracking-[-0.03em] text-ink"
                    style={{ animationDelay: "60ms" }}
                >
                    {t("titleA")}{" "}
                    <em className="whitespace-nowrap text-accent">{t("titleB")}</em>
                </h1>

                <p
                    className="animate-rise mx-auto mt-6 max-w-[40rem] text-[17px] leading-relaxed text-ink-2 sm:text-[19px]"
                    style={{ animationDelay: "120ms" }}
                >
                    {t("subtitle")}
                </p>

                <div
                    className="animate-rise mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
                    style={{ animationDelay: "180ms" }}
                >
                    <Link href="/login?mode=signup" className="btn btn-lg btn-primary group">
                        {t("ctaPrimary")}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <a href="#how" className="btn btn-lg btn-secondary">
                        {t("ctaSecondary")}
                    </a>
                </div>

                <p
                    className="animate-rise mt-5 text-[13px] text-ink-3"
                    style={{ animationDelay: "240ms" }}
                >
                    {t("note")}
                </p>
            </div>

            <div
                className="animate-rise mx-auto mt-16 max-w-5xl px-3 sm:mt-20 sm:px-8"
                style={{ animationDelay: "320ms" }}
            >
                <ReplyDemo />
            </div>
        </section>
    );
}
