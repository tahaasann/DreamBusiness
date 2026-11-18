import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import Stars from "@/components/ui/stars";

export default function FinalCta() {
    const t = useTranslations("Cta");

    return (
        <section className="px-3 pb-24 sm:px-8">
            <div className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-inverse px-6 py-20 text-center text-inverse-ink sm:px-12 sm:py-28">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/2 top-0 h-[26rem] w-[50rem] max-w-[200%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_45%,transparent),transparent)] opacity-70" />
                    <div className="grain absolute inset-0 !opacity-[0.08] !mix-blend-overlay" />
                </div>

                {/* Floating review cards */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
                    <div className="animate-float absolute left-10 top-16 w-56 -rotate-6 rounded-2xl bg-white/[0.06] p-4 text-left ring-1 ring-white/10 backdrop-blur-sm dark:bg-black/[0.05] dark:ring-black/10">
                        <Stars value={1} size={11} />
                        <div className="mt-2.5 space-y-1.5">
                            <div className="h-1.5 w-full rounded-full bg-current opacity-20" />
                            <div className="h-1.5 w-9/12 rounded-full bg-current opacity-20" />
                        </div>
                    </div>
                    <div
                        className="animate-float absolute bottom-16 right-10 w-60 rotate-6 rounded-2xl bg-white/[0.06] p-4 text-left ring-1 ring-white/10 backdrop-blur-sm dark:bg-black/[0.05] dark:ring-black/10"
                        style={{ animationDelay: "1.5s" }}
                    >
                        <Stars value={5} size={11} />
                        <div className="mt-2.5 space-y-1.5">
                            <div className="h-1.5 w-full rounded-full bg-current opacity-20" />
                            <div className="h-1.5 w-10/12 rounded-full bg-current opacity-20" />
                            <div className="h-1.5 w-6/12 rounded-full bg-current opacity-20" />
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.5rem,5.6vw,4.6rem)] leading-[1] tracking-[-0.03em]">
                        {t("title")} <em className="text-accent-inverse">{t("titleAccent")}</em>
                    </h2>
                    <p className="mx-auto mt-6 max-w-xl text-[16.5px] leading-relaxed text-inverse-2">
                        {t("subtitle")}
                    </p>
                    <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                        <Link href="/login?mode=signup" className="btn btn-lg btn-accent group">
                            {t("button")}
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="/login"
                            className="btn btn-lg text-inverse-ink ring-1 ring-current/20 hover:bg-white/10 dark:hover:bg-black/5"
                        >
                            {t("secondary")}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
