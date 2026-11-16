"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { initializePaddle, Paddle } from "@paddle/paddle-js";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/language-switcher";
import ThemeSwitcher from "@/components/theme-switcher";
import { generateAiDraft } from "@/app/actions/generate-draft";
import type { DraftLanguage, DraftTone } from "@/lib/ai/draft-prompt";
import { publishReplyAndLog } from "@/app/actions/publish-reply";
import {
    syncGoogleLocations,
    createDemoLocationForUser,
} from "@/app/actions/google-business";
import {
    Sparkles,
    LogOut,
    MapPin,
    Star,
    RefreshCw,
    Plus,
    Send,
    AlertCircle,
    ThumbsUp,
    Crown,
    Search,
    MessageSquare,
    ChevronLeft,
    Share2,
    RotateCcw,
    X,
    FolderTree,
    Building2,
    Tag,
    Layers,
    CreditCard,
    HelpCircle,
    BarChart3,
    Settings,
} from "lucide-react";

interface LocationItem {
    id: string;
    user_id?: string;
    google_location_id: string;
    business_name: string;
    default_tone?: string;
    created_at?: string;
}

interface ReviewItem {
    id: string;
    location_id: string;
    google_review_id: string;
    author_name: string;
    rating: number;
    comment: string | null;
    status: string;
    review_created_at?: string;
    created_at?: string;
}

interface DashboardClientProps {
    userId: string;
    userEmail: string;
    isPro: boolean;
    subscriptionPlan: string;
    initialLocations: LocationItem[];
    initialReviews: ReviewItem[];
}

export default function DashboardClientView({
    userId,
    userEmail,
    isPro,
    subscriptionPlan,
    initialLocations,
    initialReviews,
}: DashboardClientProps) {
    const t = useTranslations("Dashboard");
    const tNav = useTranslations("Nav");
    const [locations, setLocations] =
        useState<LocationItem[]>(initialLocations);
    const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
        initialLocations[0]?.id || null,
    );

    const activeLocationId = selectedLocationId || locations[0]?.id || null;

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<
        "all" | "pending" | "replied"
    >("all");
    const [keywords, setKeywords] = useState<string[]>([
        "Best Quality",
        "Free WiFi",
    ]);
    const [newKeywordInput, setNewKeywordInput] = useState<string>("");
    const [isTreeDrawerOpen, setIsTreeDrawerOpen] = useState<boolean>(false);

    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(
        initialReviews[0]?.id || null,
    );
    const [tone, setTone] = useState<string>("professional");
    const [language, setLanguage] = useState<string>("en-US");
    const [aiDraft, setAiDraft] = useState<string>("");
    const [editedDraft, setEditedDraft] = useState<string>("");
    const [draftUserRating, setDraftUserRating] = useState<number>(5);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isPublishing, setIsPublishing] = useState<boolean>(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isCreatingDemo, setIsCreatingDemo] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [paddle, setPaddle] = useState<Paddle | null>(null);

    useEffect(() => {
        const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
        const environment =
            process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
                ? "production"
                : "sandbox";

        if (clientToken) {
            initializePaddle({
                environment,
                token: clientToken,
            }).then((paddleInstance) => {
                if (paddleInstance) setPaddle(paddleInstance);
            });
        }
    }, []);

    const handlePaddleCheckout = () => {
        const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL;
        if (paddle && priceId) {
            paddle.Checkout.open({
                items: [{ priceId, quantity: 1 }],
                customer: { email: userEmail },
                customData: { user_id: userId }, // Guarantees user_id is delivered in webhook payloads
            });
        } else {
            setStatusMessage(
                "Paddle Client Token or Price ID missing in .env.local.",
            );
        }
    };

    const handleSyncLocations = async () => {
        setIsSyncing(true);
        setStatusMessage(null);
        const res = await syncGoogleLocations();
        if (res.success) {
            if (!res.hasRealLocations) {
                setStatusMessage(
                    "No physical Google Maps profile found for this Gmail.",
                );
            } else {
                setStatusMessage(
                    `Successfully synced locations from Google Maps!`,
                );
            }
        } else {
            setStatusMessage(`Sync Error: ${res.error}`);
        }
        setIsSyncing(false);
    };

    const handleCreateDemo = async () => {
        setIsCreatingDemo(true);
        setStatusMessage(null);
        const res = await createDemoLocationForUser();
        if (res.success && res.location && res.reviews) {
            setStatusMessage(`Added branch: ${res.location.business_name}`);
            const newLoc = res.location as LocationItem;
            const newRevs = (res.reviews as unknown as ReviewItem[]) || [];

            setLocations((prev) => {
                if (prev.some((loc) => loc.id === newLoc.id)) return prev;
                return [...prev, newLoc];
            });
            setReviews((prev) => {
                const existingIds = new Set(prev.map((r) => r.id));
                const filteredNew = newRevs.filter(
                    (r) => !existingIds.has(r.id),
                );
                return [...prev, ...filteredNew];
            });
            setSelectedLocationId(newLoc.id);
        } else {
            setStatusMessage(`Error: ${res.error}`);
        }
        setIsCreatingDemo(false);
    };

    const handleGenerateDraft = async (review: ReviewItem) => {
        setIsGenerating(true);
        setAiDraft("");
        setEditedDraft("");

        // Review text and business name are read on the server from the database.
        const result = await generateAiDraft({
            reviewId: review.id,
            tone: tone as DraftTone,
            language: language as DraftLanguage,
            targetKeywords: keywords,
        });

        if (result.success && result.draft) {
            setAiDraft(result.draft);
            setEditedDraft(result.draft);
        } else {
            setStatusMessage(result.error || "Failed to generate AI draft.");
        }
        setIsGenerating(false);
    };

    const handlePublish = async (review: ReviewItem) => {
        if (!editedDraft.trim()) return;
        setIsPublishing(true);

        const result = await publishReplyAndLog({
            reviewId: review.id,
            selectedTone: tone,
            aiGeneratedDraft: aiDraft,
            finalPublishedText: editedDraft,
            userRating: draftUserRating,
        });

        if (result.success) {
            const baseMessage =
                result.publishedTo === "google"
                    ? "Reply published on Google Maps."
                    : "Demo reply saved. Demo reviews are not sent to Google.";
            setStatusMessage(
                result.warning ? `${baseMessage} ${result.warning}` : baseMessage,
            );
            setReviews((prev) =>
                prev.map((r) =>
                    r.id === review.id ? { ...r, status: "replied" } : r,
                ),
            );
        } else {
            setStatusMessage(result.error || "Failed to publish reply.");
        }
        setIsPublishing(false);
    };

    const activeLocation =
        locations.find((loc) => loc.id === activeLocationId) || locations[0];
    const currentBusinessName = activeLocation?.business_name || "My Business";

    const locationReviews = reviews.filter(
        (r) => r.location_id === activeLocationId,
    );
    const filteredReviews = locationReviews.filter((rev) => {
        const matchesSearch =
            rev.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (rev.comment &&
                rev.comment.toLowerCase().includes(searchQuery.toLowerCase()));

        if (filterStatus === "pending")
            return matchesSearch && rev.status !== "replied";
        if (filterStatus === "replied")
            return matchesSearch && rev.status === "replied";
        return matchesSearch;
    });

    const selectedReview =
        reviews.find((r) => r.id === selectedReviewId) || filteredReviews[0];
    const pendingCount = locationReviews.filter(
        (r) => r.status !== "replied",
    ).length;

    return (
        <div className="flex h-screen overflow-hidden bg-canvas dark:bg-[#0F0F12] text-zinc-900 dark:text-[#e4e1e6] font-sans relative transition-colors duration-300">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 h-screen py-6 bg-white dark:bg-[#131316] border-r border-zinc-200 dark:border-white/10 z-40 shrink-0">
                <div className="px-6 mb-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-emerald-600 border border-emerald-500/30 flex items-center justify-center shrink-0 text-white shadow-md">
                            <Sparkles className="size-4" />
                        </div>
                        <div>
                            <h1 className="text-[18px] text-zinc-900 dark:text-white tracking-tight font-semibold">
                                Proficias
                            </h1>
                            <p className="text-[10px] text-zinc-500 dark:text-[#8E8E93] mt-0.5">
                                Local Review Management
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Sidebar Expanded Menu Navigation */}
                <nav className="flex-1 px-4 space-y-1 text-xs overflow-y-auto scrollbar-none">
                    <div className="px-3 py-1 text-[10px] font-mono uppercase text-zinc-400 dark:text-[#8E8E93] font-bold">
                        Workspace
                    </div>

                    <a
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-emerald-900 dark:text-[#ffe2ab] bg-emerald-50 dark:bg-[#1b1b1e] font-bold border border-emerald-200 dark:border-white/5 transition-all"
                    >
                        <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-[#ffbf00]" />
                        <span>Reviews Inbox</span>
                    </a>

                    <Link
                        href="/#dashboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 dark:text-[#8E8E93] hover:bg-zinc-100 dark:hover:bg-[#1f1f22] hover:text-zinc-900 dark:hover:text-white transition-all font-medium"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span>{tNav("consoleStudio")}</span>
                    </Link>

                    <Link
                        href="/#bento"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 dark:text-[#8E8E93] hover:bg-zinc-100 dark:hover:bg-[#1f1f22] hover:text-zinc-900 dark:hover:text-white transition-all font-medium"
                    >
                        <Layers className="w-4 h-4" />
                        <span>{tNav("architecture")}</span>
                    </Link>

                    <Link
                        href="/#pricing"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 dark:text-[#8E8E93] hover:bg-zinc-100 dark:hover:bg-[#1f1f22] hover:text-zinc-900 dark:hover:text-white transition-all font-medium"
                    >
                        <CreditCard className="w-4 h-4" />
                        <span>{tNav("pricing")}</span>
                    </Link>

                    <Link
                        href="/#faq"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 dark:text-[#8E8E93] hover:bg-zinc-100 dark:hover:bg-[#1f1f22] hover:text-zinc-900 dark:hover:text-white transition-all font-medium"
                    >
                        <HelpCircle className="w-4 h-4" />
                        <span>{tNav("faq")}</span>
                    </Link>

                    <div className="pt-4 px-3 py-1 text-[10px] font-mono uppercase text-zinc-400 dark:text-[#8E8E93] font-bold">
                        Settings
                    </div>

                    <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 dark:text-[#8E8E93] hover:bg-zinc-100 dark:hover:bg-[#1f1f22] hover:text-zinc-900 dark:hover:text-white transition-all font-medium"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                    </a>
                </nav>

                <div className="px-4 mt-auto space-y-3">
                    <button
                        onClick={isPro ? undefined : handlePaddleCheckout}
                        disabled={isPro}
                        className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors ${
                            isPro
                                ? "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                                : "bg-zinc-100 dark:bg-[#2a2a2d] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-[#ffe2ab] hover:bg-zinc-200 dark:hover:bg-[#39393c]"
                        }`}
                    >
                        <Crown
                            className={`w-3.5 h-3.5 ${isPro ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500 dark:text-[#ffbf00]"}`}
                        />
                        <span>
                            {isPro ? "Pro Plan Active" : t("upgradePro")}
                        </span>
                    </button>

                    <div className="pt-2 border-t border-zinc-200 dark:border-white/10 space-y-2">
                        <div className="px-1 py-1 text-xs text-zinc-500 dark:text-[#8E8E93] flex items-center justify-between">
                            <ThemeSwitcher />
                            <LanguageSwitcher />
                        </div>

                        <div className="px-3 py-1 text-[11px] text-zinc-500 dark:text-[#8E8E93] truncate">
                            {userEmail}
                        </div>

                        <form action="/auth/signout" method="post">
                            <button
                                type="submit"
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 dark:text-[#8E8E93] hover:bg-zinc-100 dark:hover:bg-[#1f1f22] hover:text-zinc-900 dark:hover:text-white transition-all text-xs cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Log Out</span>
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Workspace */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="md:hidden flex justify-between items-center w-full px-4 h-16 bg-white dark:bg-[#0F0F12] border-b border-zinc-200 dark:border-white/10 z-30 shrink-0">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="size-7 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                            <Sparkles className="size-4" />
                        </div>
                        <h1 className="font-bold text-base text-zinc-900 dark:text-[#ffe2ab] tracking-tight">
                            Proficias
                        </h1>
                    </Link>

                    <div className="flex items-center gap-2">
                        <ThemeSwitcher />
                        <LanguageSwitcher />
                        <form action="/auth/signout" method="post">
                            <button
                                type="submit"
                                className="text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </header>

                {locations.length > 0 && (
                    <div className="hidden md:flex h-12 bg-white dark:bg-[#0F0F12] border-b border-zinc-200 dark:border-white/10 items-end px-4 shrink-0 overflow-x-auto scrollbar-none">
                        <button
                            onClick={() => setIsTreeDrawerOpen(true)}
                            className="px-3 py-2.5 text-xs text-zinc-800 dark:text-[#ffe2ab] bg-zinc-100 dark:bg-[#1b1b1e] border-r border-zinc-200 dark:border-white/10 flex items-center gap-1.5 transition cursor-pointer hover:bg-zinc-200 dark:hover:bg-[#2a2a2d] mr-2"
                        >
                            <FolderTree className="w-3.5 h-3.5 text-emerald-600 dark:text-[#ffbf00]" />
                            <span className="font-mono text-[11px] font-bold">
                                Branch Hierarchy
                            </span>
                        </button>

                        {locations.map((loc) => {
                            const isActive = activeLocationId === loc.id;
                            const locCount = reviews.filter(
                                (r) => r.location_id === loc.id,
                            ).length;

                            return (
                                <button
                                    key={loc.id}
                                    onClick={() => {
                                        setSelectedLocationId(loc.id);
                                        const firstRev = reviews.find(
                                            (r) => r.location_id === loc.id,
                                        );
                                        if (firstRev)
                                            setSelectedReviewId(firstRev.id);
                                    }}
                                    className={`px-5 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors shrink-0 cursor-pointer ${
                                        isActive
                                            ? "border-emerald-600 dark:border-[#ffbf00] text-emerald-900 dark:text-[#ffe2ab] bg-zinc-100/80 dark:bg-[#131316]"
                                            : "border-transparent text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-600 dark:bg-[#ffbf00]" : "bg-zinc-400 dark:bg-[#8E8E93]"}`}
                                    />
                                    <span>{loc.business_name}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-white/5 text-zinc-600 dark:text-[#8E8E93]">
                                        {locCount}
                                    </span>
                                </button>
                            );
                        })}

                        <button
                            onClick={handleCreateDemo}
                            disabled={isCreatingDemo}
                            className="px-4 py-2.5 text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1 text-xs cursor-pointer disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            <span>
                                {isCreatingDemo ? t("adding") : t("addBranch")}
                            </span>
                        </button>

                        <button
                            onClick={handleSyncLocations}
                            disabled={isSyncing}
                            className="ml-auto px-3 py-1.5 text-xs text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
                            />
                            <span>{t("syncButton")}</span>
                        </button>
                    </div>
                )}

                {statusMessage && (
                    <div className="bg-amber-50 dark:bg-[#2a2a2d] px-4 py-2 text-xs text-amber-900 dark:text-[#ffe2ab] border-b border-amber-200 dark:border-white/10 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-[#ffbf00] shrink-0" />
                        <span>{statusMessage}</span>
                    </div>
                )}

                {/* VS Code Tree Drawer Modal */}
                {isTreeDrawerOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-4">
                        <div className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-[#e4e1e6]">
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-white/10">
                                <div className="flex items-center gap-2 font-mono text-xs text-emerald-900 dark:text-[#ffe2ab] font-bold">
                                    <FolderTree className="w-4 h-4 text-emerald-600 dark:text-[#ffbf00]" />
                                    <span>
                                        VS Code Multi-Branch Tree Hierarchy
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsTreeDrawerOpen(false)}
                                    className="text-zinc-400 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 bg-zinc-50 dark:bg-[#0F0F12] border border-zinc-200 dark:border-white/10 rounded-xl font-mono text-xs space-y-3">
                                <div className="text-zinc-500 dark:text-[#8E8E93] flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-[#ffbf00]" />
                                    <span>org-proficias-group-workspace</span>
                                </div>

                                <div className="pl-4 space-y-1.5 divide-y divide-zinc-200/50 dark:divide-white/5">
                                    {locations.map((loc) => {
                                        const pendingForLoc = reviews.filter(
                                            (r) =>
                                                r.location_id === loc.id &&
                                                r.status !== "replied",
                                        ).length;
                                        const isActive =
                                            activeLocationId === loc.id;

                                        return (
                                            <button
                                                key={loc.id}
                                                onClick={() => {
                                                    setSelectedLocationId(
                                                        loc.id,
                                                    );
                                                    const firstRev =
                                                        reviews.find(
                                                            (r) =>
                                                                r.location_id ===
                                                                loc.id,
                                                        );
                                                    if (firstRev)
                                                        setSelectedReviewId(
                                                            firstRev.id,
                                                        );
                                                    setIsTreeDrawerOpen(false);
                                                }}
                                                className={`w-full text-left py-2 px-2.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                                                    isActive
                                                        ? "bg-zinc-200/80 dark:bg-[#2a2a2d] text-emerald-900 dark:text-[#ffe2ab] font-bold"
                                                        : "hover:bg-zinc-100 dark:hover:bg-[#1b1b1e] text-zinc-600 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <MapPin
                                                        className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600 dark:text-[#ffbf00]" : "text-zinc-400 dark:text-[#8E8E93]"}`}
                                                    />
                                                    <span className="truncate">
                                                        {loc.business_name}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-white/5 text-zinc-600 dark:text-[#8E8E93]">
                                                    {pendingForLoc} PENDING
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setIsTreeDrawerOpen(false)}
                                    className="px-4 py-2 bg-zinc-100 dark:bg-[#2a2a2d] text-xs font-semibold text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-[#39393c] transition cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Split Pane */}
                <main className="flex-1 flex overflow-hidden">
                    {/* Left Column */}
                    <section
                        className={`w-full md:w-[320px] lg:w-100 shrink-0 bg-white dark:bg-[#0F0F12] border-r border-zinc-200 dark:border-white/10 flex flex-col h-full ${
                            selectedReviewId ? "hidden md:flex" : "flex"
                        }`}
                    >
                        <div className="p-4 border-b border-zinc-200 dark:border-white/10 shrink-0 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    {t("recentReviews")}
                                </h2>
                                <span className="text-[10px] font-medium text-zinc-600 dark:text-[#8E8E93] bg-zinc-100 dark:bg-[#1f1f22] px-2 py-1 rounded">
                                    {pendingCount} {t("pendingAction")}
                                </span>
                            </div>

                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400 dark:text-[#8E8E93]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Search reviews..."
                                    className="w-full bg-zinc-50 dark:bg-[#1b1b1e] border border-zinc-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-zinc-900 dark:text-white text-xs outline-none focus:border-emerald-500 dark:focus:border-[#ffbf00] transition-colors placeholder:text-zinc-400 dark:placeholder:text-[#8E8E93]"
                                />
                            </div>

                            <div className="flex bg-zinc-100 dark:bg-[#131316] border border-zinc-200 dark:border-white/10 rounded-lg p-0.5 text-xs font-medium">
                                <button
                                    onClick={() => setFilterStatus("all")}
                                    className={`flex-1 py-1 rounded transition cursor-pointer ${
                                        filterStatus === "all"
                                            ? "bg-white dark:bg-[#2a2a2d] text-zinc-900 dark:text-white shadow-xs"
                                            : "text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilterStatus("pending")}
                                    className={`flex-1 py-1 rounded transition cursor-pointer ${
                                        filterStatus === "pending"
                                            ? "bg-white dark:bg-[#2a2a2d] text-zinc-900 dark:text-white shadow-xs"
                                            : "text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                >
                                    Needs Response
                                </button>
                                <button
                                    onClick={() => setFilterStatus("replied")}
                                    className={`flex-1 py-1 rounded transition cursor-pointer ${
                                        filterStatus === "replied"
                                            ? "bg-white dark:bg-[#2a2a2d] text-zinc-900 dark:text-white shadow-xs"
                                            : "text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white"
                                    }`}
                                >
                                    Responded
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-none divide-y divide-zinc-100 dark:divide-white/5">
                            {filteredReviews.length === 0 ? (
                                <div className="p-8 text-center text-xs text-zinc-500 dark:text-[#8E8E93] space-y-2">
                                    <MapPin className="w-6 h-6 mx-auto text-zinc-300 dark:text-[#8E8E93]/50" />
                                    <p>{t("noReviews")}</p>
                                    {locations.length === 0 && (
                                        <button
                                            onClick={handleCreateDemo}
                                            className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg mt-2 cursor-pointer shadow-xs"
                                        >
                                            {t("addFirstBranch")}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredReviews.map((rev) => {
                                    const isSelected =
                                        selectedReviewId === rev.id;

                                    return (
                                        <div
                                            key={rev.id}
                                            onClick={() =>
                                                setSelectedReviewId(rev.id)
                                            }
                                            className={`p-4 cursor-pointer transition-colors ${
                                                isSelected
                                                    ? "bg-emerald-50/60 dark:bg-[#1b1b1e] border-l-2 border-l-emerald-600 dark:border-l-[#ffbf00]"
                                                    : "bg-white dark:bg-[#0F0F12] hover:bg-zinc-50 dark:hover:bg-[#131316]"
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                                                    {rev.author_name}
                                                </span>
                                                <span className="text-[10px] text-zinc-400 dark:text-[#8E8E93]">
                                                    Google
                                                </span>
                                            </div>

                                            <div className="flex text-amber-500 dark:text-[#ffbf00] mb-2 text-xs">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star
                                                        key={s}
                                                        className={`w-3.5 h-3.5 ${s <= rev.rating ? "fill-amber-500 dark:fill-[#ffbf00]" : "text-zinc-200 dark:text-slate-700"}`}
                                                    />
                                                ))}
                                            </div>

                                            <p className="text-xs text-zinc-600 dark:text-[#8E8E93] line-clamp-2 leading-relaxed">
                                                {rev.comment ||
                                                    "No comment text provided."}
                                            </p>

                                            <div className="mt-3 flex items-center gap-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider ${
                                                        rev.status === "replied"
                                                            ? "bg-emerald-100 text-emerald-900 dark:bg-[#1a2f1c] dark:text-[#81c784]"
                                                            : "bg-amber-100 text-amber-900 dark:bg-[#2a2a2d] dark:text-[#ffe2ab]"
                                                    }`}
                                                >
                                                    {rev.status === "replied"
                                                        ? t("replied")
                                                        : t("pendingAction")}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* Right Column */}
                    <section
                        className={`flex-1 flex-col bg-canvas dark:bg-[#0F0F12] overflow-y-auto p-4 sm:p-8 relative ${
                            selectedReviewId ? "flex" : "hidden md:flex"
                        }`}
                    >
                        {selectedReview ? (
                            <div className="max-w-3xl mx-auto w-full space-y-6">
                                <button
                                    onClick={() => setSelectedReviewId(null)}
                                    className="md:hidden flex items-center gap-1 text-xs text-zinc-500 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white mb-2 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Back to Inbox</span>
                                </button>

                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-[#1f1f22] border border-zinc-300 dark:border-white/10 flex items-center justify-center font-bold text-zinc-800 dark:text-white text-sm">
                                            {selectedReview.author_name.charAt(
                                                0,
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                                                {selectedReview.author_name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-[#8E8E93]">
                                                <span>Google Review</span>
                                                <span>•</span>
                                                <span>
                                                    {currentBusinessName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button className="p-2 rounded bg-white dark:bg-[#1f1f22] border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#1b1b1e] border border-zinc-200 dark:border-white/10 rounded-xl p-6 space-y-4 shadow-xs">
                                    <div className="flex justify-between items-center">
                                        <div className="flex text-amber-500 dark:text-[#ffbf00] gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${
                                                        star <=
                                                        selectedReview.rating
                                                            ? "fill-amber-500 dark:fill-[#ffbf00]"
                                                            : "text-zinc-200 dark:text-slate-700"
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] text-zinc-400 dark:text-[#8E8E93]">
                                            Google Maps Review
                                        </span>
                                    </div>

                                    <p className="text-sm text-zinc-800 dark:text-[#e4e1e6] leading-relaxed">
                                        &quot;
                                        {selectedReview.comment ||
                                            "No comment text provided."}
                                        &quot;
                                    </p>
                                </div>

                                {/* Local SEO Target Keyword Injector Bar */}
                                <div className="p-3 bg-white dark:bg-[#1b1b1e] border border-zinc-200 dark:border-white/10 rounded-xl space-y-2 shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold text-emerald-900 dark:text-[#ffe2ab] flex items-center gap-1.5 uppercase">
                                            <Tag className="w-3 h-3 text-emerald-600 dark:text-[#ffbf00]" />
                                            Local SEO Target Keywords
                                        </span>
                                        <span className="text-[9px] text-zinc-400 dark:text-[#8E8E93]">
                                            Injected into AI response
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {keywords.map((kw) => (
                                            <span
                                                key={kw}
                                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-[#2a2a2d] border border-emerald-200 dark:border-white/10 text-emerald-900 dark:text-[#ffe2ab] flex items-center gap-1"
                                            >
                                                ✓ {kw}
                                                <button
                                                    onClick={() =>
                                                        setKeywords(
                                                            keywords.filter(
                                                                (k) => k !== kw,
                                                            ),
                                                        )
                                                    }
                                                    className="text-zinc-400 dark:text-[#8E8E93] hover:text-red-500 cursor-pointer ml-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}

                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                if (
                                                    newKeywordInput.trim() &&
                                                    !keywords.includes(
                                                        newKeywordInput.trim(),
                                                    )
                                                ) {
                                                    setKeywords([
                                                        ...keywords,
                                                        newKeywordInput.trim(),
                                                    ]);
                                                    setNewKeywordInput("");
                                                }
                                            }}
                                            className="flex items-center gap-1"
                                        >
                                            <input
                                                type="text"
                                                placeholder="+ Add keyword"
                                                value={newKeywordInput}
                                                onChange={(e) =>
                                                    setNewKeywordInput(
                                                        e.target.value,
                                                    )
                                                }
                                                className="bg-zinc-50 dark:bg-[#0F0F12] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-[10px] rounded px-2 py-0.5 outline-none focus:border-emerald-500 dark:focus:border-[#ffbf00] w-28"
                                            />
                                        </form>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-emerald-900 dark:text-[#ffe2ab] uppercase tracking-wider flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-[#ffbf00]" />
                                            {t("aiDraftTitle")}
                                        </h4>
                                        <span className="text-[10px] text-zinc-400 dark:text-[#8E8E93]">
                                            Gemini 3.5 Flash-Lite
                                        </span>
                                    </div>

                                    <div className="bg-white dark:bg-[#1b1b1e] border border-zinc-200 dark:border-white/10 rounded-xl flex flex-col overflow-hidden shadow-xl">
                                        <div className="p-3 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0F0F12] flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select
                                                    value={tone}
                                                    onChange={(e) =>
                                                        setTone(e.target.value)
                                                    }
                                                    className="bg-white dark:bg-[#1f1f22] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 dark:focus:border-[#ffbf00]"
                                                >
                                                    <option value="professional">
                                                        {t("prof")}
                                                    </option>
                                                    <option value="friendly">
                                                        {t("friendly")}
                                                    </option>
                                                    <option value="apologetic">
                                                        {t("apologetic")}
                                                    </option>
                                                    <option value="casual">
                                                        {t("casual")}
                                                    </option>
                                                </select>

                                                <select
                                                    value={language}
                                                    onChange={(e) =>
                                                        setLanguage(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="bg-white dark:bg-[#1f1f22] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 dark:focus:border-[#ffbf00]"
                                                >
                                                    <option value="en-US">
                                                        English (US)
                                                    </option>
                                                    <option value="en-GB">
                                                        English (UK)
                                                    </option>
                                                    <option value="es">
                                                        Spanish
                                                    </option>
                                                    <option value="de">
                                                        German
                                                    </option>
                                                    <option value="fr">
                                                        French
                                                    </option>
                                                    <option value="it">
                                                        Italian
                                                    </option>
                                                    <option value="pt">
                                                        Portuguese
                                                    </option>
                                                    <option value="tr">
                                                        Turkish
                                                    </option>
                                                </select>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    handleGenerateDraft(
                                                        selectedReview,
                                                    )
                                                }
                                                disabled={isGenerating}
                                                className="text-emerald-700 dark:text-[#ffe2ab] hover:text-emerald-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <RotateCcw
                                                    className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`}
                                                />
                                                <span>
                                                    {isGenerating
                                                        ? t("generating")
                                                        : t("draftButton")}
                                                </span>
                                            </button>
                                        </div>

                                        <textarea
                                            rows={5}
                                            value={editedDraft}
                                            onChange={(e) =>
                                                setEditedDraft(e.target.value)
                                            }
                                            placeholder="Click 'Generate AI Draft' to generate a localized SEO draft response..."
                                            className="w-full bg-white dark:bg-[#0F0F12] border-none p-5 text-zinc-900 dark:text-white text-xs leading-relaxed resize-none focus:ring-0 outline-none placeholder:text-zinc-400 dark:placeholder:text-[#8E8E93]"
                                        />

                                        {editedDraft && (
                                            <div className="px-5 py-2.5 bg-zinc-50 dark:bg-[#131316] border-t border-zinc-200 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-[11px] text-zinc-500 dark:text-[#8E8E93] flex items-center gap-1.5">
                                                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-[#ffbf00]" />
                                                    {t("rateQuality")}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map(
                                                        (s) => (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                onClick={() =>
                                                                    setDraftUserRating(
                                                                        s,
                                                                    )
                                                                }
                                                                className={`p-1 cursor-pointer ${
                                                                    s <=
                                                                    draftUserRating
                                                                        ? "text-amber-500 dark:text-[#ffbf00]"
                                                                        : "text-zinc-300 dark:text-slate-700"
                                                                }`}
                                                            >
                                                                <Star className="w-3.5 h-3.5 fill-current" />
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0F0F12] flex items-center justify-between">
                                            <span className="text-[11px] text-zinc-500 dark:text-[#8E8E93]">
                                                {t("editHint")}
                                            </span>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() =>
                                                        setEditedDraft("")
                                                    }
                                                    className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-[#8E8E93] hover:text-zinc-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                                                >
                                                    Discard
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handlePublish(
                                                            selectedReview,
                                                        )
                                                    }
                                                    disabled={
                                                        isPublishing ||
                                                        !editedDraft.trim()
                                                    }
                                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 dark:bg-[#ffbf00] dark:hover:bg-[#ffe2ab] text-white dark:text-[#402d00] text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                    <span>
                                                        {isPublishing
                                                            ? t("publishing")
                                                            : t(
                                                                  "publishButton",
                                                              )}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="my-auto text-center text-zinc-400 dark:text-[#8E8E93] space-y-2">
                                <MessageSquare className="w-8 h-8 mx-auto text-zinc-300 dark:text-[#8E8E93]/40" />
                                <p className="text-xs">
                                    Select a review from the left inbox to view
                                    details & generate AI drafts.
                                </p>
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}
