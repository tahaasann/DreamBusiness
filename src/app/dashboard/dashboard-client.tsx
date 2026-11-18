"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Loader2, LogOut, Plus, Sparkles } from "lucide-react";
import { generateAiDraft } from "@/app/actions/generate-draft";
import { publishReplyAndLog } from "@/app/actions/publish-reply";
import { createDemoLocationForUser } from "@/app/actions/google-business";
import { LogoMark } from "@/components/brand/logo";
import ThemeSwitcher from "@/components/theme-switcher";
import LanguageSwitcher from "@/components/language-switcher";
import Sidebar, { AppAvatar, PlanCard } from "@/components/dashboard/sidebar";
import ReviewList, { type Filter, type Sort } from "@/components/dashboard/review-list";
import ReviewDetail, { type Draft } from "@/components/dashboard/review-detail";
import { Toaster, useToasts } from "@/components/dashboard/toaster";
import {
    isReplied,
    reviewTime,
    type AppItem,
    type ReviewItem,
} from "@/components/dashboard/helpers";
import { detectReviewLanguage } from "@/lib/ai/detect-language";
import {
    isDraftLanguage,
    isDraftTone,
    REPLY_CHAR_LIMIT,
    type DraftLanguage,
} from "@/lib/ai/draft-options";
import { cn } from "@/lib/cn";

interface DashboardClientProps {
    userId: string;
    userEmail: string;
    isPro: boolean;
    initialLocations: AppItem[];
    initialReviews: ReviewItem[];
}

async function celebrate() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { default: confetti } = await import("canvas-confetti");
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    confetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 38,
        origin: { y: 0.75 },
        colors: [accent || "#3346f5", "#f2a516", "#15803d", "#ff7a59"],
        disableForReducedMotion: true,
    });
}

export default function DashboardClientView({
    userId,
    userEmail,
    isPro,
    initialLocations,
    initialReviews,
}: DashboardClientProps) {
    const t = useTranslations("Dashboard");
    const locale = useLocale();
    const uiLanguage: DraftLanguage = isDraftLanguage(locale) ? locale : "en-US";

    const [apps, setApps] = useState<AppItem[]>(initialLocations);
    const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
    const [activeAppId, setActiveAppId] = useState<string | null>(initialLocations[0]?.id ?? null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("newest");
    const [keywords, setKeywords] = useState<string[]>([]);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [published, setPublished] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<{ kind: "draft" | "publish"; id: string } | null>(null);
    const [addingDemo, setAddingDemo] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [paddle, setPaddle] = useState<Paddle | null>(null);
    const { toasts, push, dismiss } = useToasts();
    const searchRef = useRef<HTMLInputElement>(null);
    const detailRef = useRef<HTMLDivElement>(null);

    // ── Billing ────────────────────────────────────────────────────────────
    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
        if (!token) return;
        initializePaddle({
            environment:
                process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production" ? "production" : "sandbox",
            token,
        }).then((instance) => instance && setPaddle(instance));
    }, []);

    const handleUpgrade = () => {
        const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL;
        if (paddle && priceId) {
            paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                customer: { email: userEmail },
                customData: { user_id: userId }, // user_id reaches the webhook through custom_data
            });
        } else {
            push("info", t("checkoutUnavailable"));
        }
    };

    // ── Derived data ───────────────────────────────────────────────────────
    const activeApp = apps.find((app) => app.id === activeAppId) ?? apps[0] ?? null;

    const pendingByApp = useMemo(() => {
        const map: Record<string, number> = {};
        for (const review of reviews) {
            if (!isReplied(review)) map[review.location_id] = (map[review.location_id] ?? 0) + 1;
        }
        return map;
    }, [reviews]);

    const appReviews = useMemo(
        () => reviews.filter((review) => review.location_id === activeApp?.id),
        [reviews, activeApp?.id],
    );

    const counts = useMemo(
        () => ({
            all: appReviews.length,
            pending: appReviews.filter((r) => !isReplied(r)).length,
            replied: appReviews.filter(isReplied).length,
        }),
        [appReviews],
    );

    const averageRating = appReviews.length
        ? appReviews.reduce((sum, r) => sum + r.rating, 0) / appReviews.length
        : null;

    const visibleReviews = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        return appReviews
            .filter((review) => {
                if (filter === "pending" && isReplied(review)) return false;
                if (filter === "replied" && !isReplied(review)) return false;
                if (!needle) return true;
                return (
                    review.author_name.toLocaleLowerCase().includes(needle) ||
                    (review.comment ?? "").toLocaleLowerCase().includes(needle)
                );
            })
            .sort((a, b) =>
                sort === "lowest" && a.rating !== b.rating
                    ? a.rating - b.rating
                    : reviewTime(b).localeCompare(reviewTime(a)),
            );
    }, [appReviews, filter, query, sort]);

    const selectedReview =
        appReviews.find((review) => review.id === selectedId) ?? visibleReviews[0] ?? null;

    const languageGuess = useMemo(
        () => (selectedReview ? detectReviewLanguage(selectedReview.comment, uiLanguage) : null),
        [selectedReview, uiLanguage],
    );

    const appTone = activeApp?.default_tone;
    const draftFor = useCallback(
        (review: ReviewItem): Draft =>
            drafts[review.id] ?? {
                ai: "",
                text: "",
                rating: 5,
                tone: isDraftTone(appTone) ? appTone : "professional",
                language: detectReviewLanguage(review.comment, uiLanguage).language,
            },
        [drafts, appTone, uiLanguage],
    );

    const updateDraft = useCallback(
        (review: ReviewItem, patch: Partial<Draft>) =>
            setDrafts((all) => ({ ...all, [review.id]: { ...draftFor(review), ...patch } })),
        [draftFor],
    );

    // ── Navigation ─────────────────────────────────────────────────────────
    const selectReview = useCallback((id: string) => {
        setSelectedId(id);
        setMobilePane("detail");
        detailRef.current?.scrollTo({ top: 0 });
    }, []);

    const selectApp = (id: string) => {
        setActiveAppId(id);
        setSelectedId(null);
        setMobilePane("list");
        setAccountOpen(false);
    };

    const moveSelection = useCallback(
        (step: number) => {
            if (!visibleReviews.length) return;
            const index = selectedReview ? visibleReviews.findIndex((r) => r.id === selectedReview.id) : -1;
            const next = visibleReviews[Math.min(visibleReviews.length - 1, Math.max(0, index + step))];
            if (next) {
                setSelectedId(next.id);
                document.getElementById(`review-${next.id}`)?.scrollIntoView({ block: "nearest" });
            }
        },
        [visibleReviews, selectedReview],
    );

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            const typing = target?.closest("input, textarea, select, [contenteditable='true']");
            if (event.key === "/" && !typing) {
                event.preventDefault();
                searchRef.current?.focus();
            } else if (!typing && (event.key === "j" || event.key === "k")) {
                event.preventDefault();
                moveSelection(event.key === "j" ? 1 : -1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [moveSelection]);

    const nextPending = selectedReview
        ? visibleReviews.find((r) => r.id !== selectedReview.id && !isReplied(r))
        : undefined;

    // ── Actions ────────────────────────────────────────────────────────────
    const handleAddDemo = async () => {
        setAddingDemo(true);
        const result = await createDemoLocationForUser();
        if (result.success && result.location) {
            const app = result.location as AppItem;
            const newReviews = (result.reviews as unknown as ReviewItem[]) ?? [];
            setApps((list) => (list.some((a) => a.id === app.id) ? list : [...list, app]));
            setReviews((list) => {
                const seen = new Set(list.map((r) => r.id));
                return [...list, ...newReviews.filter((r) => !seen.has(r.id))];
            });
            setActiveAppId(app.id);
            setSelectedId(null);
            setMobilePane("list");
            push("success", t("demoAdded", { name: app.business_name }));
        } else {
            push("error", result.error ?? t("draftFailed"));
        }
        setAddingDemo(false);
        setAccountOpen(false);
    };

    const handleGenerate = async (review: ReviewItem) => {
        const draft = draftFor(review);
        setBusy({ kind: "draft", id: review.id });
        const result = await generateAiDraft({
            reviewId: review.id,
            tone: draft.tone,
            language: draft.language,
            targetKeywords: keywords,
        });
        if (result.success && result.draft) {
            updateDraft(review, { ai: result.draft, text: result.draft, rating: 5 });
        } else {
            push("error", result.error ?? t("draftFailed"));
        }
        setBusy(null);
    };

    const handlePublish = async (review: ReviewItem) => {
        const draft = draftFor(review);
        const text = draft.text.trim();
        if (!text || text.length > REPLY_CHAR_LIMIT) return;

        setBusy({ kind: "publish", id: review.id });
        const result = await publishReplyAndLog({
            reviewId: review.id,
            selectedTone: draft.tone,
            aiGeneratedDraft: draft.ai,
            finalPublishedText: text,
            userRating: draft.rating,
        });

        if (result.success) {
            const wasLastPending = !isReplied(review) && (pendingByApp[review.location_id] ?? 0) === 1;
            setReviews((list) => list.map((r) => (r.id === review.id ? { ...r, status: "replied" } : r)));
            setPublished((map) => ({ ...map, [review.id]: text }));
            setDrafts((all) => {
                const rest = { ...all };
                delete rest[review.id];
                return rest;
            });
            const base = result.publishedTo === "google" ? t("publishedLive") : t("publishedDemo");
            push("success", result.warning ? `${base} ${result.warning}` : base);
            if (wasLastPending) void celebrate();
        } else {
            push("error", result.error ?? t("publishFailed"));
        }
        setBusy(null);
    };

    // ── Layout ─────────────────────────────────────────────────────────────
    const totalPending = Object.values(pendingByApp).reduce((a, b) => a + b, 0);

    return (
        <div className="flex h-dvh overflow-hidden bg-canvas text-ink">
            <Sidebar
                apps={apps}
                pendingByApp={pendingByApp}
                activeAppId={activeApp?.id ?? null}
                onSelectApp={selectApp}
                onAddDemo={handleAddDemo}
                addingDemo={addingDemo}
                isPro={isPro}
                onUpgrade={handleUpgrade}
                userEmail={userEmail}
                totalPending={totalPending}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Compact top bar (below lg) */}
                <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/90 px-3 backdrop-blur lg:hidden">
                    <Link href="/" aria-label={t("backToSite")} className="rounded-lg p-1">
                        <LogoMark className="size-7" />
                    </Link>
                    {apps.length > 0 && (
                        <label className="relative min-w-0 max-w-64 flex-1">
                            <span className="sr-only">{t("appSwitcher")}</span>
                            <select
                                value={activeApp?.id ?? ""}
                                onChange={(e) => selectApp(e.target.value)}
                                className="h-9 w-full appearance-none truncate rounded-xl bg-surface pl-3 pr-8 text-[14px] font-medium shadow-xs ring-1 ring-line outline-none focus-visible:ring-accent"
                            >
                                {apps.map((app) => (
                                    <option key={app.id} value={app.id}>
                                        {app.business_name}
                                        {pendingByApp[app.id] ? ` (${pendingByApp[app.id]})` : ""}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                        </label>
                    )}
                    <div className="ml-auto flex items-center gap-0.5">
                        <ThemeSwitcher />
                        <button
                            type="button"
                            onClick={() => setAccountOpen((v) => !v)}
                            aria-expanded={accountOpen}
                            aria-label={t("account")}
                            className="ml-1 rounded-full"
                        >
                            <span className="avatar size-8 text-[12px]" style={{ "--h": 250 } as React.CSSProperties}>
                                {(userEmail[0] ?? "?").toLocaleUpperCase()}
                            </span>
                        </button>
                    </div>
                </header>

                {/* Account sheet (below lg). Kept outside the blurred header so
                    `fixed` positions against the viewport. */}
                {accountOpen && (
                        <div className="lg:hidden">
                            <button
                                type="button"
                                aria-label={t("dismiss")}
                                className="fixed inset-0 top-14 z-40 bg-ink/20 backdrop-blur-[2px]"
                                onClick={() => setAccountOpen(false)}
                            />
                            <div className="animate-pop fixed right-3 top-[3.75rem] z-50 w-[min(20rem,calc(100vw-1.5rem))] space-y-3 rounded-2xl bg-surface p-3 shadow-float ring-1 ring-line">
                                <p className="truncate px-1 text-[13px] text-ink-2">{userEmail}</p>
                                <PlanCard isPro={isPro} onUpgrade={handleUpgrade} />
                                <button
                                    type="button"
                                    onClick={handleAddDemo}
                                    disabled={addingDemo}
                                    className="btn btn-secondary w-full"
                                >
                                    {addingDemo ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                    {addingDemo ? t("addingDemoApp") : t("addDemoApp")}
                                </button>
                                <LanguageSwitcher variant="full" />
                                <form action="/auth/signout" method="post">
                                    <button type="submit" className="btn btn-ghost w-full justify-start">
                                        <LogOut className="size-4" />
                                        {t("signOut")}
                                    </button>
                                </form>
                            </div>
                        </div>
                )}

                {apps.length === 0 || !activeApp ? (
                    <main className="relative flex flex-1 items-center justify-center overflow-y-auto px-5 py-16">
                        <div aria-hidden="true" className="hairline-grid absolute inset-0 opacity-50" />
                        <div className="animate-rise relative max-w-md text-center">
                            <LogoMark className="mx-auto size-14" />
                            <h1 className="mt-7 font-display text-[2.8rem] leading-none tracking-[-0.025em]">
                                {t("welcomeTitle")}
                            </h1>
                            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">{t("welcomeBody")}</p>
                            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={handleAddDemo}
                                    disabled={addingDemo}
                                    className="btn btn-lg btn-accent"
                                >
                                    {addingDemo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                    {addingDemo ? t("addingDemoApp") : t("addDemoApp")}
                                </button>
                                <span
                                    aria-disabled="true"
                                    className="btn btn-lg btn-secondary pointer-events-none opacity-60"
                                >
                                    {t("connectPlay")}
                                    <span className="rounded-full bg-line px-1.5 py-px text-[11px] text-ink-3">
                                        {t("comingSoon")}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </main>
                ) : (
                    <main className="flex min-h-0 flex-1">
                        <ReviewList
                            ref={searchRef}
                            appName={activeApp.business_name}
                            reviews={visibleReviews}
                            counts={counts}
                            averageRating={averageRating}
                            selectedId={selectedReview?.id ?? null}
                            onSelect={selectReview}
                            query={query}
                            onQueryChange={setQuery}
                            filter={filter}
                            onFilterChange={setFilter}
                            sort={sort}
                            onSortChange={setSort}
                            className={cn(
                                "w-full md:w-[22rem] md:shrink-0 xl:w-[24rem]",
                                mobilePane === "detail" && "hidden md:flex",
                            )}
                        />

                        <div
                            ref={detailRef}
                            className={cn(
                                "thin-scrollbar min-w-0 flex-1 overflow-y-auto",
                                mobilePane === "list" && "hidden md:block",
                            )}
                        >
                            {selectedReview ? (
                                <ReviewDetail
                                    key={selectedReview.id}
                                    review={selectedReview}
                                    draft={draftFor(selectedReview)}
                                    detectedLanguage={languageGuess?.detected ? languageGuess.language : null}
                                    onDraftChange={(patch) => updateDraft(selectedReview, patch)}
                                    keywords={keywords}
                                    onKeywordsChange={setKeywords}
                                    generating={busy?.kind === "draft" && busy.id === selectedReview.id}
                                    publishing={busy?.kind === "publish" && busy.id === selectedReview.id}
                                    publishedText={published[selectedReview.id] ?? null}
                                    onGenerate={() => handleGenerate(selectedReview)}
                                    onPublish={() => handlePublish(selectedReview)}
                                    onDiscard={() => updateDraft(selectedReview, { text: "", ai: "" })}
                                    onEditPublished={() => {
                                        const text = published[selectedReview.id] ?? "";
                                        setPublished((map) => {
                                            const rest = { ...map };
                                            delete rest[selectedReview.id];
                                            return rest;
                                        });
                                        updateDraft(selectedReview, { text });
                                    }}
                                    onNext={nextPending ? () => selectReview(nextPending.id) : null}
                                    onBack={() => setMobilePane("list")}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center p-10 text-center text-[14px] text-ink-3">
                                    <div>
                                        <AppAvatar name={activeApp.business_name} className="mx-auto size-12 rounded-2xl text-[15px]" />
                                        <p className="mt-4 max-w-xs">{t("selectReview")}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                )}
            </div>

            <Toaster toasts={toasts} onDismiss={dismiss} />
        </div>
    );
}
