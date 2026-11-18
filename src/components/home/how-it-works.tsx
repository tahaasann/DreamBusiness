import { useTranslations } from "next-intl";
import { Bell, Check, FileKey2, Lock, Sparkles } from "lucide-react";
import Stars from "@/components/ui/stars";

function ConnectVisual() {
    const t = useTranslations("How");
    return (
        <div className="relative flex h-full flex-col justify-center gap-3 px-6">
            <div className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-card ring-1 ring-line">
                <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
                    <FileKey2 className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                    <p className="truncate font-mono text-[12px] text-ink">service-account.json</p>
                    <p className="text-[11px] text-ink-3">2.3 KB</p>
                </div>
                <Check className="ml-auto size-4 text-ok" strokeWidth={2.5} />
            </div>
            <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-mono text-[10.5px] text-ink-2 ring-1 ring-line">
                    <Lock className="size-3" />
                    AES-256-GCM
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-[10.5px] font-medium text-ok">
                    <Check className="size-3" strokeWidth={2.5} />
                    {t("permission")}
                </span>
            </div>
        </div>
    );
}

function DraftVisual() {
    const rows = [
        { initials: "JP", hue: 25, rating: 1, lang: "EN" },
        { initials: "LW", hue: 300, rating: 2, lang: "DE" },
        { initials: "EK", hue: 160, rating: 3, lang: "TR" },
    ];
    const t = useTranslations("How");
    return (
        <div className="flex h-full flex-col justify-center gap-2 px-5">
            {rows.map((row, i) => (
                <div
                    key={row.initials}
                    className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 shadow-xs ring-1 ring-line"
                    style={{ marginLeft: `${i * 10}px`, marginRight: `${(2 - i) * 10}px` }}
                >
                    <span className="avatar size-6 text-[9.5px]" style={{ "--h": row.hue } as React.CSSProperties}>
                        {row.initials}
                    </span>
                    <Stars value={row.rating} size={9.5} />
                    <span className="font-mono text-[10px] text-ink-3">{row.lang}</span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                        <Sparkles className="size-2.5" />
                        {t("draftReady")}
                    </span>
                </div>
            ))}
        </div>
    );
}

function PostVisual() {
    const t = useTranslations("How");
    return (
        <div className="flex h-full flex-col justify-center gap-2.5 px-6">
            <div className="rounded-xl bg-surface p-3.5 shadow-card ring-1 ring-line">
                <div className="flex items-center justify-between">
                    <span className="eyebrow">{t("developerReply")}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-medium text-ok">
                        <Check className="size-2.5" strokeWidth={3} />
                        {t("posted")}
                    </span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                    <div className="h-2 w-full rounded-full bg-line" />
                    <div className="h-2 w-11/12 rounded-full bg-line" />
                    <div className="h-2 w-7/12 rounded-full bg-line" />
                </div>
            </div>
            <div className="flex items-center gap-2 self-end rounded-full bg-surface px-3 py-1.5 text-[11px] text-ink-2 shadow-xs ring-1 ring-line">
                <Bell className="size-3 text-accent" />
                {t("notified")}
            </div>
        </div>
    );
}

const STEPS = [
    { key: "s1", Visual: ConnectVisual },
    { key: "s2", Visual: DraftVisual },
    { key: "s3", Visual: PostVisual },
] as const;

export default function HowItWorks() {
    const t = useTranslations("How");

    return (
        <section id="how" className="scroll-mt-16 border-y border-line bg-subtle/60 py-28 md:py-32">
            <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <div className="reveal max-w-2xl">
                    <p className="eyebrow">{t("eyebrow")}</p>
                    <h2 className="mt-4 font-display text-[clamp(2.4rem,4.6vw,3.6rem)] leading-[1.02] tracking-[-0.025em] text-ink">
                        {t("title")}
                    </h2>
                </div>

                <ol className="mt-14 grid gap-5 md:grid-cols-3">
                    {STEPS.map(({ key, Visual }, index) => (
                        <li key={key} className="reveal card flex flex-col p-2">
                            <div className="relative h-48 overflow-hidden rounded-[0.9rem] bg-subtle ring-1 ring-line">
                                <div aria-hidden="true" className="hairline-grid absolute inset-0 opacity-50 [mask-image:none]" />
                                <div className="relative h-full">
                                    <Visual />
                                </div>
                            </div>
                            <div className="px-4 pb-5 pt-5">
                                <span className="font-mono text-[12px] text-accent">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <h3 className="mt-1.5 text-[18px] font-semibold tracking-tight text-ink">
                                    {t(`${key}Title`)}
                                </h3>
                                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{t(`${key}Body`)}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
