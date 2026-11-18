"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownWideNarrow, Check, CheckCheck, Search, SearchX } from "lucide-react";
import Stars from "@/components/ui/stars";
import { cn } from "@/lib/cn";
import {
    hueFor,
    initialsFor,
    isReplied,
    reviewTime,
    useRelativeTime,
    type ReviewItem,
} from "./helpers";

export type Filter = "all" | "pending" | "replied";
export type Sort = "newest" | "lowest";

interface ReviewListProps {
    appName: string;
    reviews: ReviewItem[];
    counts: Record<Filter, number>;
    averageRating: number | null;
    selectedId: string | null;
    onSelect: (id: string) => void;
    query: string;
    onQueryChange: (value: string) => void;
    filter: Filter;
    onFilterChange: (value: Filter) => void;
    sort: Sort;
    onSortChange: (value: Sort) => void;
    className?: string;
}

const ReviewList = forwardRef<HTMLInputElement, ReviewListProps>(function ReviewList(
    {
        appName,
        reviews,
        counts,
        averageRating,
        selectedId,
        onSelect,
        query,
        onQueryChange,
        filter,
        onFilterChange,
        sort,
        onSortChange,
        className,
    },
    searchRef,
) {
    const t = useTranslations("Dashboard");
    const relative = useRelativeTime();

    const filters: { key: Filter; label: string }[] = [
        { key: "all", label: t("filterAll") },
        { key: "pending", label: t("filterPending") },
        { key: "replied", label: t("filterReplied") },
    ];

    const inboxZero = counts.all > 0 && counts.pending === 0;

    return (
        <section className={cn("flex min-h-0 flex-col border-r border-line bg-canvas", className)}>
            <header className="space-y-3 border-b border-line px-4 pb-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="truncate text-[17px] font-semibold tracking-tight">{appName}</h1>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                            {t("reviewsCount", { count: counts.all })}
                            {averageRating !== null && (
                                <>
                                    <span aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-1">
                                        {t("avgRating")}
                                        <span className="font-medium text-ink-2 tabular">{averageRating.toFixed(1)}</span>
                                        <Stars value={averageRating} size={10} />
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                    <span
                        className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular",
                            counts.pending > 0 ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok",
                        )}
                    >
                        {t("pendingCount", { count: counts.pending })}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                <label className="relative block min-w-0 flex-1">
                    <span className="sr-only">{t("searchPlaceholder")}</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                    <input
                        ref={searchRef}
                        type="search"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && (e.currentTarget as HTMLInputElement).blur()}
                        placeholder={t("searchPlaceholder")}
                        className="field h-9 pl-9 pr-10 text-[13.5px] [&::-webkit-search-cancel-button]:hidden"
                    />
                    <kbd className="kbd pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 md:inline-grid">/</kbd>
                </label>
                    <label className="relative shrink-0">
                        <span className="sr-only">{t("sortLabel")}</span>
                        <ArrowDownWideNarrow className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
                        <select
                            value={sort}
                            onChange={(e) => onSortChange(e.target.value as Sort)}
                            title={t("sortLabel")}
                            className="h-9 max-w-36 appearance-none truncate rounded-[0.75rem] bg-surface pl-8 pr-3 text-[12.5px] font-medium text-ink-2 shadow-xs ring-1 ring-line-strong outline-none transition hover:text-ink focus-visible:ring-accent"
                        >
                            <option value="newest">{t("sortNewest")}</option>
                            <option value="lowest">{t("sortLowest")}</option>
                        </select>
                    </label>
                </div>

                    <div
                        role="tablist"
                        aria-label={t("filterLabel")}
                        className="flex rounded-[0.7rem] bg-subtle p-0.5 ring-1 ring-line"
                    >
                        {filters.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="tab"
                                aria-selected={filter === item.key}
                                onClick={() => onFilterChange(item.key)}
                                className={cn(
                                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[0.55rem] px-1.5 py-1 text-[12px] font-medium transition-all",
                                    filter === item.key
                                        ? "bg-surface text-ink shadow-xs ring-1 ring-line"
                                        : "text-ink-3 hover:text-ink",
                                )}
                            >
                                <span className="truncate">{item.label}</span>
                                <span className="text-[11px] text-ink-3 tabular">{counts[item.key]}</span>
                            </button>
                        ))}
                    </div>
            </header>

            <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto">
                {reviews.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
                        {inboxZero && filter === "pending" ? (
                            <>
                                <span className="grid size-12 place-items-center rounded-2xl bg-ok-soft text-ok">
                                    <CheckCheck className="size-5" />
                                </span>
                                <p className="mt-4 font-display text-[26px] leading-none">{t("inboxZeroTitle")}</p>
                                <p className="mt-2 max-w-[16rem] text-[13px] text-ink-3">
                                    {t("inboxZeroBody", { app: appName })}
                                </p>
                            </>
                        ) : counts.all === 0 ? (
                            <p className="text-[13.5px] text-ink-3">{t("noReviews")}</p>
                        ) : (
                            <>
                                <SearchX className="size-6 text-ink-3" strokeWidth={1.5} />
                                <p className="mt-3 text-[13.5px] text-ink-3">{t("emptyFilter")}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onQueryChange("");
                                        onFilterChange("all");
                                    }}
                                    className="btn btn-sm btn-secondary mt-4"
                                >
                                    {t("clearFilters")}
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <ul className="p-2">
                        {reviews.map((review) => {
                            const selected = review.id === selectedId;
                            const replied = isReplied(review);
                            return (
                                <li key={review.id}>
                                    <button
                                        id={`review-${review.id}`}
                                        type="button"
                                        onClick={() => onSelect(review.id)}
                                        aria-current={selected}
                                        className={cn(
                                            "group relative w-full rounded-xl px-3 py-3 text-left transition-colors",
                                            selected ? "bg-surface shadow-card ring-1 ring-line" : "hover:bg-hover/70",
                                        )}
                                    >
                                        {!replied && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute left-1 top-[1.15rem] size-1.5 rounded-full bg-accent"
                                            />
                                        )}
                                        <div className="flex items-start gap-3">
                                            <span
                                                className="avatar size-8 text-[11px]"
                                                style={{ "--h": hueFor(review.author_name) } as React.CSSProperties}
                                            >
                                                {initialsFor(review.author_name)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span
                                                        className={cn(
                                                            "truncate text-[13.5px]",
                                                            replied ? "text-ink-2" : "font-semibold text-ink",
                                                        )}
                                                    >
                                                        {review.author_name}
                                                    </span>
                                                    <span className="shrink-0 text-[11.5px] text-ink-3 tabular">
                                                        {relative(reviewTime(review))}
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 flex items-center gap-2">
                                                    <Stars value={review.rating} size={11} />
                                                    {replied && (
                                                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-ok">
                                                            <Check className="size-3" strokeWidth={2.5} />
                                                            {t("statusReplied")}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-ink-3">
                                                    {review.comment || t("noComment")}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <footer className="hidden items-center gap-4 border-t border-line px-4 py-2.5 text-[11.5px] text-ink-3 md:flex">
                <span className="inline-flex items-center gap-1.5">
                    <kbd className="kbd">J</kbd>
                    <kbd className="kbd">K</kbd>
                    {t("kbdNavigate")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <kbd className="kbd">/</kbd>
                    {t("kbdSearch")}
                </span>
            </footer>
        </section>
    );
});

export default ReviewList;
