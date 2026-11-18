"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronDown,
    Languages,
    Loader2,
    PenLine,
    RotateCcw,
    Smartphone,
    Sparkles,
    ThumbsUp,
} from "lucide-react";
import Stars from "@/components/ui/stars";
import { LANGUAGES } from "@/components/language-switcher";
import {
    DRAFT_LANGUAGES,
    DRAFT_TONES,
    REPLY_CHAR_LIMIT,
    type DraftLanguage,
    type DraftTone,
} from "@/lib/ai/draft-options";
import { cn } from "@/lib/cn";
import {
    androidVersionName,
    authorOf,
    hueFor,
    initialsFor,
    isReplied,
    reviewTime,
    useRelativeTime,
    type ReviewItem,
} from "./helpers";

export interface Draft {
    ai: string;
    text: string;
    tone: DraftTone;
    language: DraftLanguage;
}

const LANGUAGE_LABEL = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.label])) as Record<string, string>;

const noopSubscribe = () => () => {};
function useIsMac() {
    return useSyncExternalStore(
        noopSubscribe,
        () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
        () => false,
    );
}

function CounterRing({ value, max }: { value: number; max: number }) {
    const r = 8;
    const c = 2 * Math.PI * r;
    const ratio = Math.min(1, value / max);
    const over = value > max;
    return (
        <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden="true">
            <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.25" className="stroke-line-strong" />
            <circle
                cx="10"
                cy="10"
                r={r}
                fill="none"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeDasharray={`${ratio * c} ${c}`}
                className={cn(
                    "transition-[stroke-dasharray] duration-300",
                    over ? "stroke-bad" : ratio > 0.9 ? "stroke-warn" : "stroke-accent",
                )}
            />
        </svg>
    );
}

interface ReviewDetailProps {
    review: ReviewItem;
    draft: Draft;
    detectedLanguage: DraftLanguage | null;
    onDraftChange: (patch: Partial<Draft>) => void;
    isDemo: boolean;
    generating: boolean;
    publishing: boolean;
    publishedText: string | null;
    onGenerate: () => void;
    onPublish: () => void;
    onDiscard: () => void;
    onEditPublished: () => void;
    onNext: (() => void) | null;
    onBack: () => void;
}

export default function ReviewDetail({
    review,
    draft,
    detectedLanguage,
    onDraftChange,
    isDemo,
    generating,
    publishing,
    publishedText,
    onGenerate,
    onPublish,
    onDiscard,
    onEditPublished,
    onNext,
    onBack,
}: ReviewDetailProps) {
    const t = useTranslations("Dashboard");
    const tTone = useTranslations("Tones");
    const relative = useRelativeTime();
    const isMac = useIsMac();

    const length = draft.text.length;
    const over = length > REPLY_CHAR_LIMIT;
    const canPublish = draft.text.trim().length > 0 && !over && !publishing && !generating;
    const hasText = draft.text.length > 0;
    const author = authorOf(review, t("anonymousReviewer"));
    const technical = [
        review.app_version_name && t("versionLabel", { version: review.app_version_name }),
        review.device,
        androidVersionName(review.android_os_version),
    ].filter(Boolean) as string[];

    return (
        <article className="mx-auto w-full max-w-[46rem] px-4 pb-16 pt-4 sm:px-8 sm:pt-8">
            <button
                type="button"
                onClick={onBack}
                className="btn btn-sm btn-ghost -ml-2 mb-4 md:hidden"
            >
                <ArrowLeft className="size-4" />
                {t("back")}
            </button>

            {/* Reviewer */}
            <header className="flex items-start gap-3.5">
                <span
                    className="avatar size-11 text-[14px]"
                    style={{ "--h": hueFor(author) } as React.CSSProperties}
                >
                    {initialsFor(author)}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <h2 className="text-[17px] font-semibold tracking-tight">{author}</h2>
                        <span
                            className={cn(
                                "rounded-full px-2 py-px text-[11px] font-medium",
                                isReplied(review) ? "bg-ok-soft text-ok" : "bg-accent-soft text-accent",
                            )}
                        >
                            {isReplied(review) ? t("statusReplied") : t("statusPending")}
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-3">
                        <Stars value={review.star_rating} size={13} />
                        <span>{relative(reviewTime(review))}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px] uppercase tracking-wide">
                            {isDemo ? t("sourceDemo") : t("sourcePlay")}
                        </span>
                        {detectedLanguage && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1">
                                    <Languages className="size-3" />
                                    {LANGUAGE_LABEL[detectedLanguage]}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <blockquote className="mt-6 whitespace-pre-line font-display text-[23px] leading-[1.32] tracking-[-0.01em] text-ink sm:text-[27px]">
                {review.review_text ? `“${review.review_text}”` : <span className="text-ink-3">{t("noComment")}</span>}
            </blockquote>

            {(technical.length > 0 || review.thumbs_up_count > 0) && (
                <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
                    {technical.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-subtle px-2 py-1 ring-1 ring-line">
                            <Smartphone className="size-3.5" aria-hidden="true" />
                            {technical.join(" · ")}
                        </span>
                    )}
                    {review.thumbs_up_count > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-subtle px-2 py-1 ring-1 ring-line">
                            <ThumbsUp className="size-3.5" aria-hidden="true" />
                            {t("helpfulCount", { count: review.thumbs_up_count })}
                        </span>
                    )}
                </p>
            )}

            {/* Published state */}
            {publishedText !== null ? (
                <section className="animate-pop mt-8 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
                    <div className="flex items-center justify-between gap-3">
                        <p className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-ok">
                            <span className="grid size-5 place-items-center rounded-full bg-ok text-surface">
                                <Check className="size-3" strokeWidth={3} />
                            </span>
                            {t("postedTitle")}
                        </p>
                        <button type="button" onClick={onEditPublished} className="btn btn-sm btn-ghost">
                            <PenLine className="size-3.5" />
                            {t("yourReply")}
                        </button>
                    </div>
                    <p className="mt-3 border-l-2 border-line-strong pl-4 text-[14.5px] leading-relaxed text-ink-2">
                        {publishedText}
                    </p>
                    {onNext && (
                        <div className="mt-5 flex justify-end">
                            <button type="button" onClick={onNext} className="btn btn-primary group">
                                {t("nextReview")}
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </div>
                    )}
                </section>
            ) : (
                <section className="mt-8" aria-label={t("yourReply")}>
                    {isReplied(review) && (
                        <div className="mb-4 rounded-xl bg-ok-soft px-3.5 py-2.5 text-[13px] text-ok">
                            <p className="flex items-center gap-2 font-medium">
                                <Check className="size-4 shrink-0" />
                                {t("repliedNote")}
                            </p>
                            {review.developer_reply_text && (
                                <p className="mt-2 border-l-2 border-ok/40 pl-3 text-[13.5px] leading-relaxed text-ink-2">
                                    {review.developer_reply_text}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="min-w-0">
                            <p className="eyebrow mb-1.5">{t("tone")}</p>
                            <div
                                role="radiogroup"
                                aria-label={t("tone")}
                                className="no-scrollbar flex overflow-x-auto rounded-xl bg-subtle p-1 ring-1 ring-line"
                            >
                                {DRAFT_TONES.map((tone) => (
                                    <button
                                        key={tone}
                                        type="button"
                                        role="radio"
                                        aria-checked={draft.tone === tone}
                                        onClick={() => onDraftChange({ tone })}
                                        className={cn(
                                            "flex-1 whitespace-nowrap rounded-[0.6rem] px-3 py-1.5 text-[12.5px] font-medium transition-all",
                                            draft.tone === tone
                                                ? "bg-surface text-ink shadow-xs ring-1 ring-line"
                                                : "text-ink-3 hover:text-ink",
                                        )}
                                    >
                                        {tTone(tone)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                                {t("language")}
                                {detectedLanguage === draft.language && (
                                    <span className="rounded bg-accent-soft px-1 py-px font-sans text-[10px] normal-case tracking-normal text-accent">
                                        {t("detectedBadge")}
                                    </span>
                                )}
                            </p>
                            <label className="relative block">
                                <span className="sr-only">{t("language")}</span>
                                <select
                                    value={draft.language}
                                    onChange={(e) => onDraftChange({ language: e.target.value as DraftLanguage })}
                                    className="field h-[2.4rem] appearance-none pr-9 text-[13px] sm:w-44"
                                >
                                    {DRAFT_LANGUAGES.map((code) => (
                                        <option key={code} value={code}>
                                            {LANGUAGE_LABEL[code]}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                            </label>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="ai-border mt-5 rounded-2xl" data-active={generating}>
                        <div className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
                            <div className="relative">
                                <textarea
                                    value={draft.text}
                                    onChange={(e) => onDraftChange({ text: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canPublish) {
                                            e.preventDefault();
                                            onPublish();
                                        }
                                    }}
                                    readOnly={generating}
                                    placeholder={generating ? "" : t("placeholder")}
                                    aria-label={t("yourReply")}
                                    aria-invalid={over}
                                    lang={draft.language}
                                    className={cn(
                                        "block max-h-[22rem] min-h-[10rem] w-full resize-none bg-transparent px-5 pb-3 pt-4 text-[15px] leading-relaxed text-ink outline-none [field-sizing:content]",
                                        generating && hasText && "opacity-40",
                                    )}
                                />
                                {generating && (
                                    <div className="pointer-events-none absolute inset-x-5 top-4 space-y-2.5" aria-live="polite">
                                        {!hasText && (
                                            <>
                                                <div className="shimmer h-3.5 w-11/12 rounded-full" />
                                                <div className="shimmer h-3.5 w-10/12 rounded-full" />
                                                <div className="shimmer h-3.5 w-8/12 rounded-full" />
                                            </>
                                        )}
                                        <p className="flex items-center gap-1.5 pt-1 text-[12.5px] font-medium text-accent">
                                            <Sparkles className="size-3.5" />
                                            {t("drafting", {
                                                tone: tTone(draft.tone).toLocaleLowerCase(),
                                                language: LANGUAGE_LABEL[draft.language],
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {over && (
                                <p className="px-5 pb-2 text-[12.5px] font-medium text-bad" role="alert">
                                    {t("overLimit", { count: length - REPLY_CHAR_LIMIT })}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-subtle/60 px-3 py-2.5 sm:px-4">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1.5 pl-1 font-mono text-[12px] tabular",
                                        over ? "text-bad" : "text-ink-3",
                                    )}
                                    aria-label={`${length} / ${REPLY_CHAR_LIMIT}`}
                                >
                                    <CounterRing value={length} max={REPLY_CHAR_LIMIT} />
                                    {length}/{REPLY_CHAR_LIMIT}
                                </span>

                                <div className="ml-auto flex flex-wrap items-center gap-2">
                                    {hasText && !generating && (
                                        <button type="button" onClick={onDiscard} className="btn btn-sm btn-ghost">
                                            {t("discard")}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onGenerate}
                                        disabled={generating || publishing}
                                        className={cn("btn btn-sm", hasText ? "btn-secondary" : "btn-accent")}
                                    >
                                        {generating ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : hasText ? (
                                            <RotateCcw className="size-3.5" />
                                        ) : (
                                            <Sparkles className="size-3.5" />
                                        )}
                                        {hasText ? t("regenerate") : t("draftWithAi")}
                                    </button>
                                    {hasText && (
                                        <button
                                            type="button"
                                            onClick={onPublish}
                                            disabled={!canPublish}
                                            className="btn btn-sm btn-primary"
                                        >
                                            {publishing ? (
                                                <>
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                    {t("publishing")}
                                                </>
                                            ) : (
                                                <>
                                                    {t("publish")}
                                                    <span className="ml-0.5 hidden rounded bg-white/15 px-1 font-mono text-[10.5px] dark:bg-black/10 sm:inline">
                                                        {isMac ? "⌘↵" : "Ctrl ↵"}
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </article>
    );
}
