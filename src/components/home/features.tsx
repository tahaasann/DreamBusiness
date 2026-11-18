import { useTranslations } from "next-intl";
import { ArrowDownWideNarrow, Check, PenLine, ShieldAlert, Tag } from "lucide-react";
import Stars from "@/components/ui/stars";
import ToneShowcase from "@/components/home/tone-showcase";
import { cn } from "@/lib/cn";

const GREETINGS = [
    { word: "Thank you", code: "EN-US" },
    { word: "Cheers", code: "EN-GB" },
    { word: "Danke", code: "DE" },
    { word: "Gracias", code: "ES" },
    { word: "Merci", code: "FR" },
    { word: "Grazie", code: "IT" },
    { word: "Obrigado", code: "PT" },
    { word: "Teşekkürler", code: "TR" },
];

function FeatureCard({
    title,
    body,
    children,
    className,
}: {
    title: string;
    body: string;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <article className={cn("reveal card flex flex-col overflow-hidden p-6 sm:p-7", className)}>
            {children && <div className="mb-6 flex-1">{children}</div>}
            <h3 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{body}</p>
        </article>
    );
}

function GreetingRow({ reverse = false }: { reverse?: boolean }) {
    const items = reverse ? [...GREETINGS].reverse() : GREETINGS;
    return (
        <div className="flex w-max gap-2.5 pr-2.5" aria-hidden="true">
            {[...items, ...items].map((g, i) => (
                <span
                    key={`${g.code}-${i}`}
                    className="inline-flex items-center gap-2 rounded-full bg-subtle py-2 pl-4 pr-2 ring-1 ring-line"
                >
                    <span className="font-display text-[20px] leading-none text-ink">{g.word}</span>
                    <span className="rounded-full bg-surface px-1.5 py-0.5 font-mono text-[9.5px] text-ink-3 ring-1 ring-line">
                        {g.code}
                    </span>
                </span>
            ))}
        </div>
    );
}

export default function Features() {
    const t = useTranslations("Features");

    const counterValue = 287;
    const counterRatio = counterValue / 350;

    return (
        <section id="features" className="scroll-mt-16 py-28 md:py-36">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <div className="reveal mx-auto max-w-2xl text-center">
                    <p className="eyebrow">{t("eyebrow")}</p>
                    <h2 className="mt-4 font-display text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[1.02] tracking-[-0.025em] text-ink">
                        {t("title")}
                    </h2>
                </div>

                <div className="mt-14 grid gap-5 md:grid-cols-3">
                    {/* Languages */}
                    <FeatureCard
                        title={t("langTitle")}
                        body={t("langBody")}
                        className="group md:col-span-2"
                    >
                        <div className="-mx-6 flex h-full flex-col justify-center gap-2.5 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] sm:-mx-7">
                            <div className="marquee">
                                <GreetingRow />
                            </div>
                            <div className="marquee-reverse">
                                <GreetingRow reverse />
                            </div>
                        </div>
                    </FeatureCard>

                    {/* 350 limit */}
                    <FeatureCard title={t("limitTitle")} body={t("limitBody")}>
                        <div className="flex h-full items-center gap-5">
                            <div className="relative grid size-24 shrink-0 place-items-center">
                                <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
                                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" className="stroke-line" />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="42"
                                        fill="none"
                                        strokeWidth="7"
                                        strokeLinecap="round"
                                        strokeDasharray={`${counterRatio * 263.9} 263.9`}
                                        className="stroke-accent"
                                    />
                                </svg>
                                <span className="text-center font-mono text-[13px] leading-tight text-ink tabular">
                                    {counterValue}
                                    <span className="block text-[10.5px] text-ink-3">/ 350</span>
                                </span>
                            </div>
                            <div className="w-full space-y-1.5" aria-hidden="true">
                                <div className="h-2 w-full rounded-full bg-line" />
                                <div className="h-2 w-11/12 rounded-full bg-line" />
                                <div className="h-2 w-full rounded-full bg-line" />
                                <div className="h-2 w-5/12 rounded-full bg-accent/50" />
                            </div>
                        </div>
                    </FeatureCard>

                    {/* Tones */}
                    <FeatureCard title={t("toneTitle")} body={t("toneBody")}>
                        <ToneShowcase />
                    </FeatureCard>

                    {/* Human approval */}
                    <FeatureCard title={t("approvalTitle")} body={t("approvalBody")}>
                        <div className="flex h-full flex-col justify-center gap-3 rounded-xl bg-subtle p-4 ring-1 ring-line">
                            <div className="flex items-center gap-2 text-[12px] text-ink-2">
                                <span className="relative flex size-2">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-warn opacity-60" />
                                    <span className="relative inline-flex size-2 rounded-full bg-warn" />
                                </span>
                                {t("approvalWaiting")}
                            </div>
                            <div className="space-y-1.5" aria-hidden="true">
                                <div className="h-2 w-full rounded-full bg-line" />
                                <div className="h-2 w-10/12 rounded-full bg-line" />
                            </div>
                            <div className="flex gap-2">
                                <span className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface text-[12px] font-medium text-ink-2 ring-1 ring-line">
                                    <PenLine className="size-3.5" />
                                    {t("approvalEdit")}
                                </span>
                                <span className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-inverse text-[12px] font-medium text-inverse-ink">
                                    <Check className="size-3.5" strokeWidth={2.5} />
                                    {t("approvalApprove")}
                                </span>
                            </div>
                        </div>
                    </FeatureCard>

                    {/* Prompt injection */}
                    <FeatureCard title={t("shieldTitle")} body={t("shieldBody")}>
                        <div className="flex h-full flex-col justify-center gap-3">
                            <div className="rounded-xl bg-subtle p-4 ring-1 ring-line">
                                <Stars value={1} size={11} />
                                <p className="mt-2 font-display text-[16px] leading-snug text-ink-3 line-through decoration-bad/60 decoration-[1.5px]">
                                    “{t("shieldExample")}”
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-bad-soft px-2.5 py-1 text-[11px] font-medium text-bad">
                                <ShieldAlert className="size-3.5" />
                                {t("shieldFlag")}
                            </span>
                        </div>
                    </FeatureCard>

                    {/* Worst first */}
                    <FeatureCard
                        title={t("priorityTitle")}
                        body={t("priorityBody")}
                        className="md:col-span-2"
                    >
                        <div className="rounded-xl bg-subtle p-2 ring-1 ring-line">
                            <div className="flex items-center justify-between px-2 pb-2 pt-1">
                                <span className="eyebrow">{t("priorityInbox")}</span>
                                <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-ink-2 ring-1 ring-line">
                                    <ArrowDownWideNarrow className="size-3" />
                                    {t("prioritySort")}
                                </span>
                            </div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {[
                                    { name: "Noah B.", hue: 40, rating: 1, text: "Login loop after 5.0 update" },
                                    { name: "Chloé M.", hue: 330, rating: 1, text: "Impossible de restaurer mes achats" },
                                    { name: "Arda Y.", hue: 180, rating: 2, text: "Bildirimler gecikmeli geliyor" },
                                    { name: "Sofía R.", hue: 260, rating: 3, text: "Me gusta, pero falta modo oscuro" },
                                ].map((row) => (
                                    <div
                                        key={row.name}
                                        className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5 ring-1 ring-line"
                                    >
                                        <span
                                            className="avatar size-6 text-[9px]"
                                            style={{ "--h": row.hue } as React.CSSProperties}
                                        >
                                            {row.name.slice(0, 1)}
                                        </span>
                                        <div className="min-w-0">
                                            <Stars value={row.rating} size={9.5} />
                                            <p className="truncate text-[12px] text-ink-2">{row.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FeatureCard>

                    {/* Key phrases */}
                    <FeatureCard title={t("phrasesTitle")} body={t("phrasesBody")}>
                        <div className="flex h-full flex-wrap content-center gap-2">
                            {["v4.2.2", "Help → Contact", "offline mode", "family plan"].map((phrase) => (
                                <span
                                    key={phrase}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1.5 font-mono text-[11.5px] text-accent"
                                >
                                    <Tag className="size-3" />
                                    {phrase}
                                </span>
                            ))}
                        </div>
                    </FeatureCard>
                </div>
            </div>
        </section>
    );
}
