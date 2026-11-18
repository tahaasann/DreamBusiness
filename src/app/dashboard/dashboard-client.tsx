"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Loader2, LogOut, Plus, Sparkles } from "lucide-react";
import { generatePlayDraft } from "@/app/actions/play-draft";
import { publishPlayReply, syncPlayAppNow } from "@/app/actions/play";
import { createDemoPlayApp } from "@/app/actions/play-apps";
import { LogoMark } from "@/components/brand/logo";
import ThemeSwitcher from "@/components/theme-switcher";
import LanguageSwitcher from "@/components/language-switcher";
import Sidebar, { AppAvatar, PlanCard } from "@/components/dashboard/sidebar";
import ReviewList, { NO_FACETS, type Facets, type Filter, type Sort } from "@/components/dashboard/review-list";
import ReviewDetail, { type Draft } from "@/components/dashboard/review-detail";
import ConnectPlayDialog, { type ConnectMode } from "@/components/dashboard/connect-play-dialog";
import { Toaster, useToasts } from "@/components/dashboard/toaster";
import {
    isReplied,
    reviewTime,
    type AppItem,
    type CredentialItem,
    type ReviewItem,
} from "@/components/dashboard/helpers";
import { defaultReplyLanguage } from "@/lib/ai/play-prompt";
import { isDraftTone, REPLY_CHAR_LIMIT } from "@/lib/ai/draft-options";
import { cn } from "@/lib/cn";

interface DashboardClientProps {
    userId: string;
    userEmail: string;
    isPro: boolean;
    initialApps: AppItem[];
    initialReviews: ReviewItem[];
    initialCredentials: CredentialItem[];
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
    initialApps,
    initialReviews,
    initialCredentials,
}: DashboardClientProps) {
    const t = useTranslations("Dashboard");
    const locale = useLocale();
    const [apps, setApps] = useState<AppItem[]>(initialApps);
    const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
    const [credentials, setCredentials] = useState<CredentialItem[]>(initialCredentials);
    const [activeAppId, setActiveAppId] = useState<string | null>(initialApps[0]?.id ?? null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("newest");
    const [facets, setFacets] = useState<Facets>(NO_FACETS);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [published, setPublished] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<{ kind: "draft" | "publish"; id: string } | null>(null);
    const [addingDemo, setAddingDemo] = useState(false);
    const [syncingAppId, setSyncingAppId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<{ open: boolean; mode: ConnectMode }>({ open: false, mode: "connect" });
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
            if (!isReplied(review)) map[review.app_id] = (map[review.app_id] ?? 0) + 1;
        }
        return map;
    }, [reviews]);

    const appReviews = useMemo(
        () => reviews.filter((review) => review.app_id === activeApp?.id),
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
        ? appReviews.reduce((sum, r) => sum + r.star_rating, 0) / appReviews.length
        : null;

    // Facet options come from the reviews actually present for this app.
    const languageOf = (review: ReviewItem) => review.reviewer_language?.split(/[-_]/)[0]?.toLowerCase() ?? "";
    const languageOptions = useMemo(() => {
        const names = new Intl.DisplayNames([locale], { type: "language" });
        return [...new Set(appReviews.map(languageOf).filter(Boolean))]
            .map((code) => ({ value: code, label: names.of(code) ?? code }))
            .sort((a, b) => a.label.localeCompare(b.label, locale));
    }, [appReviews, locale]);
    const versionOptions = useMemo(
        () =>
            [...new Set(appReviews.map((r) => r.app_version_name).filter((v): v is string => Boolean(v)))].sort((a, b) =>
                b.localeCompare(a, undefined, { numeric: true }),
            ),
        [appReviews],
    );

    const visibleReviews = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        return appReviews
            .filter((review) => {
                if (filter === "pending" && isReplied(review)) return false;
                if (filter === "replied" && !isReplied(review)) return false;
                if (facets.stars !== "all" && review.star_rating !== Number(facets.stars)) return false;
                if (facets.language !== "all" && languageOf(review) !== facets.language) return false;
                if (facets.version !== "all" && review.app_version_name !== facets.version) return false;
                if (!needle) return true;
                return (
                    (review.author_name ?? "").toLocaleLowerCase().includes(needle) ||
                    (review.review_text ?? "").toLocaleLowerCase().includes(needle)
                );
            })
            .sort((a, b) =>
                sort === "lowest" && a.star_rating !== b.star_rating
                    ? a.star_rating - b.star_rating
                    : reviewTime(b).localeCompare(reviewTime(a)),
            );
    }, [appReviews, facets, filter, query, sort]);

    const selectedReview =
        appReviews.find((review) => review.id === selectedId) ?? visibleReviews[0] ?? null;

    const languageGuess = useMemo(
        () => (selectedReview ? defaultReplyLanguage(selectedReview.reviewer_language, selectedReview.review_text) : null),
        [selectedReview],
    );

    const appTone = activeApp?.default_tone;
    const draftFor = useCallback(
        (review: ReviewItem): Draft =>
            drafts[review.id] ?? {
                ai: "",
                text: "",
                tone: isDraftTone(appTone) ? appTone : "professional",
                language: defaultReplyLanguage(review.reviewer_language, review.review_text).language,
            },
        [drafts, appTone],
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
        setFacets(NO_FACETS);
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
    const showApp = (app: AppItem, appReviewsList: ReviewItem[]) => {
        setApps((list) => (list.some((a) => a.id === app.id) ? list.map((a) => (a.id === app.id ? app : a)) : [...list, app]));
        setReviews((list) => [...list.filter((r) => r.app_id !== app.id), ...appReviewsList]);
        setActiveAppId(app.id);
        setSelectedId(null);
        setFacets(NO_FACETS);
        setMobilePane("list");
    };

    const handleAddDemo = async () => {
        setAddingDemo(true);
        const result = await createDemoPlayApp();
        if (result.success) {
            showApp(result.app, result.reviews);
            push("success", t("demoAdded", { name: result.app.display_name }));
        } else {
            push("error", result.error);
        }
        setAddingDemo(false);
        setAccountOpen(false);
    };

    const openConnect = () => {
        setAccountOpen(false);
        setDialog({ open: true, mode: credentials.length ? "add" : "connect" });
    };

    const handleSync = async (app: AppItem) => {
        setSyncingAppId(app.id);
        const result = await syncPlayAppNow(app.id);
        if (result.success) {
            if (result.app) showApp(result.app, result.reviews);
            push("success", t("syncDone", { count: result.fetched }));
        } else {
            if (result.app) setApps((list) => list.map((a) => (a.id === app.id ? (result.app as AppItem) : a)));
            push("error", result.error);
        }
        setSyncingAppId(null);
    };

    const handleGenerate = async (review: ReviewItem) => {
        const draft = draftFor(review);
        setBusy({ kind: "draft", id: review.id });
        const result = await generatePlayDraft({ reviewId: review.id, tone: draft.tone, language: draft.language });
        if (result.success) {
            updateDraft(review, { ai: result.draft, text: result.draft, language: result.language, tone: result.tone });
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
        const result = await publishPlayReply({
            reviewId: review.id,
            replyText: text,
            aiDraft: draft.ai.trim() || text,
            tone: draft.tone,
            language: draft.language,
        });

        if (result.success) {
            const wasLastPending = !isReplied(review) && (pendingByApp[review.app_id] ?? 0) === 1;
            setReviews((list) =>
                list.map((r) => (r.id === review.id ? { ...r, status: "replied", developer_reply_text: text } : r)),
            );
            setPublished((map) => ({ ...map, [review.id]: text }));
            setDrafts((all) => {
                const rest = { ...all };
                delete rest[review.id];
                return rest;
            });
            const base = result.publishedTo === "google_play" ? t("publishedLive") : t("publishedDemo");
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
                credentials={credentials}
                onConnect={openConnect}
                onManageConnection={() => setDialog({ open: true, mode: "manage" })}
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
                                        {app.display_name}
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
                                <button type="button" onClick={openConnect} className="btn btn-accent w-full">
                                    <Plus className="size-4" />
                                    {credentials.length ? t("addApp") : t("connectPlay")}
                                </button>
                                {credentials.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAccountOpen(false);
                                            setDialog({ open: true, mode: "manage" });
                                        }}
                                        className="btn btn-ghost w-full justify-start text-[13px]"
                                    >
                                        {t("manageConnection")}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleAddDemo}
                                    disabled={addingDemo}
                                    className="btn btn-secondary w-full"
                                >
                                    {addingDemo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
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
                                <button type="button" onClick={openConnect} className="btn btn-lg btn-accent">
                                    <Plus className="size-4" />
                                    {credentials.length ? t("addApp") : t("connectPlay")}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddDemo}
                                    disabled={addingDemo}
                                    className="btn btn-lg btn-secondary"
                                >
                                    {addingDemo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                    {addingDemo ? t("addingDemoApp") : t("tryDemo")}
                                </button>
                            </div>
                            <p className="mt-5 text-[12.5px] text-ink-3">{t("connectHint")}</p>
                        </div>
                    </main>
                ) : (
                    <main className="flex min-h-0 flex-1">
                        <ReviewList
                            ref={searchRef}
                            appName={activeApp.display_name}
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
                            facets={facets}
                            onFacetsChange={setFacets}
                            languageOptions={languageOptions}
                            versionOptions={versionOptions}
                            sync={{
                                isDemo: activeApp.is_demo,
                                connected: Boolean(activeApp.credential_id),
                                lastSyncedAt: activeApp.last_synced_at,
                                error: activeApp.last_sync_error,
                                syncing: syncingAppId === activeApp.id,
                                onSync: () => handleSync(activeApp),
                            }}
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
                                    detectedLanguage={
                                        languageGuess && languageGuess.source !== "fallback" ? languageGuess.language : null
                                    }
                                    onDraftChange={(patch) => updateDraft(selectedReview, patch)}
                                    isDemo={activeApp.is_demo}
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
                                        <AppAvatar name={activeApp.display_name} className="mx-auto size-12 rounded-2xl text-[15px]" />
                                        <p className="mt-4 max-w-xs">{t("selectReview")}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                )}
            </div>

            <ConnectPlayDialog
                open={dialog.open}
                mode={dialog.mode}
                credential={credentials[0] ?? null}
                onClose={() => setDialog((d) => ({ ...d, open: false }))}
                onCredentialSaved={(credential) =>
                    setCredentials((list) => [credential, ...list.filter((c) => c.id !== credential.id)])
                }
                onAppAdded={(app, appReviewsList, note) => {
                    showApp(app, appReviewsList);
                    push(note ? "info" : "success", note ?? t("appAdded", { name: app.display_name }));
                }}
                onDisconnected={(credentialId, removedAppIds) => {
                    setCredentials((list) => list.filter((c) => c.id !== credentialId));
                    setApps((list) =>
                        list
                            .filter((a) => !removedAppIds.includes(a.id))
                            .map((a) => (a.credential_id === credentialId ? { ...a, credential_id: null } : a)),
                    );
                    setReviews((list) => list.filter((r) => !removedAppIds.includes(r.app_id)));
                    push("success", t("disconnected"));
                }}
            />

            <Toaster toasts={toasts} onDismiss={dismiss} />
        </div>
    );
}
