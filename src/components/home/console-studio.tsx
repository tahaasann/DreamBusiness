"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
    Sparkles,
    Plus,
    LayoutDashboard,
    MessageSquare,
    BarChart3,
    MapPin,
    Settings,
    Search,
    Star,
    Share2,
    MoreHorizontal,
    Bot,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";

interface ReviewItem {
    id: number;
    name: string;
    time: string;
    rating: number;
    reviewText: string;
    status: string;
    channel: string;
    location: string;
    avatar: string;
    aiResponses: {
        professional: string;
        empathetic: string;
        concise: string;
    };
}

export default function ConsoleStudio() {
    const t = useTranslations("ConsoleStudio");
    const [activeTabLocation, setActiveTabLocation] = useState<
        "downtown" | "uptown"
    >("downtown");
    const [selectedReviewId, setSelectedReviewId] = useState<number>(1);
    const [activeTone, setActiveTone] = useState<
        "professional" | "empathetic" | "concise"
    >("professional");
    const [isApproved, setIsApproved] = useState<boolean>(false);

    const reviews: ReviewItem[] = [
        {
            id: 1,
            name: "Sarah Jenkins",
            time: "2h ago",
            rating: 3,
            reviewText:
                "Food was decent but the service was incredibly slow. We waited over 45 minutes for our main courses to arrive. The server apologized but didn't offer any explanation. Probably won't be coming back for dinner.",
            status: "Needs Reply",
            channel: "Google",
            location: "Downtown Location",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            aiResponses: {
                professional:
                    "Hi Sarah,\n\nThank you for taking the time to share your feedback. We are truly sorry to hear that your experience did not meet our usual standards, particularly regarding the speed of service.\n\nWaiting 45 minutes for your main course is unacceptable, and we apologize that our team did not handle the situation better during your visit. We have shared your comments with our kitchen management to ensure this doesn't happen again.\n\nPlease reach out to us at support@proficias.com so we can make this right.\n\nBest regards,\nThe Management Team",
                empathetic:
                    "Dear Sarah,\n\nWe hear you loud and clear, and we deeply apologize for making you wait so long. We know how frustrating it is when a dinner out gets ruined by slow service.\n\nYour feedback about the 45-minute wait has been brought directly to our head chef. We want to win your trust back—please email us at support@proficias.com so we can invite you back for drinks on us.\n\nWarmly,\nCustomer Experience Team",
                concise:
                    "Hi Sarah,\n\nThanks for your review. We sincerely apologize for the 45-minute wait time during your dinner. We're addressing this directly with our kitchen staff to prevent future delays.\n\nPlease email support@proficias.com so we can make it up to you.\n\nBest,\nProficias Support",
            },
        },
        {
            id: 2,
            name: "Michael R.",
            time: "5h ago",
            rating: 5,
            reviewText:
                "Absolutely fantastic experience! The new artisan menu items are incredible and the barista staff was super attentive. Best coffee in town!",
            status: "Replied",
            channel: "Google",
            location: "Downtown Location",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            aiResponses: {
                professional:
                    "Hi Michael,\n\nThank you for the wonderful 5-star review! We are thrilled to hear that you enjoyed our new menu items and exceptional service.\n\nWe look forward to serving you again soon!\n\nBest regards,\nProficias Team",
                empathetic:
                    "Hi Michael!\n\nThis made our whole team smile! We put a lot of heart into our new artisan menu, so hearing you loved it means the world to us.\n\nSee you again soon for your next coffee run!",
                concise:
                    "Thanks Michael! Thrilled you loved the new menu and coffee. See you next time!",
            },
        },
        {
            id: 3,
            name: "David Chen",
            time: "1d ago",
            rating: 2,
            reviewText:
                "The ambiance is great but it was far too loud to have a business conversation. Also, street parking is a nightmare in this location.",
            status: "Needs Reply",
            channel: "Google",
            location: "Downtown Location",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            aiResponses: {
                professional:
                    "Hi David,\n\nThank you for sharing your feedback regarding noise levels and parking. We strive to offer a comfortable environment and will evaluate sound management during peak hours.\n\nWe also offer complimentary customer valet behind our building for future visits.\n\nBest regards,\nManagement",
                empathetic:
                    "Hi David,\n\nWe're so sorry noise and parking made your meeting stressful. We know how important a quiet atmosphere is for business discussions.\n\nNext time, please try our quiet back lounge area and use our complimentary valet service behind the building!",
                concise:
                    "Hi David, thanks for the feedback. We're working on sound dampening and offer free valet parking behind the building to make visits easier.",
            },
        },
    ];

    const selectedReview =
        reviews.find((r) => r.id === selectedReviewId) || reviews[0];

    const handleApprove = async () => {
        setIsApproved(true);
        const confetti = (await import("canvas-confetti")).default;
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#059669", "#10B981", "#34D399"],
        });
    };

    return (
        <section
            id="dashboard"
            className="pt-12 pb-16 text-left max-w-6xl mx-auto px-4 sm:px-6"
        >
            <div className="text-center mb-8">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-3.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {t("badge")}
                </span>
                <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-zinc-950 dark:text-white font-display mt-3">
                    {t("title")}
                </h2>
            </div>

            <div className="liquid-glass-card rounded-3xl border border-white/90 dark:border-zinc-800 shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 font-body">
                <div className="bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTabLocation("downtown")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                                activeTabLocation === "downtown"
                                    ? "bg-white dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 shadow-xs font-bold border border-zinc-200/80 dark:border-zinc-700"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            }`}
                        >
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t("downtownTab")}
                        </button>

                        <button
                            onClick={() => setActiveTabLocation("uptown")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                activeTabLocation === "uptown"
                                    ? "bg-white dark:bg-zinc-800 text-emerald-800 dark:text-emerald-300 shadow-xs font-bold border border-zinc-200/80 dark:border-zinc-700"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            }`}
                        >
                            {t("uptownTab")}
                        </button>

                        <button className="p-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer">
                            <Plus className="size-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                            {t("apiStatus")}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row h-auto lg:h-155 bg-white/80 dark:bg-zinc-900/90 overflow-hidden">
                    <aside className="hidden md:flex flex-col w-56 bg-zinc-50/90 dark:bg-zinc-950/80 border-r border-zinc-200/80 dark:border-zinc-800 p-4 shrink-0 justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 font-display font-semibold text-zinc-900 dark:text-white text-base">
                                <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white">
                                    <Sparkles className="size-3.5" />
                                </div>
                                <span>Proficias</span>
                            </div>

                            <nav className="space-y-1 font-mono text-xs">
                                <Link
                                    href="/dashboard"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    <LayoutDashboard className="size-4" />{" "}
                                    Dashboard
                                </Link>
                                <a
                                    href="#"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800 shadow-xs"
                                >
                                    <MessageSquare className="size-4 text-emerald-600 dark:text-emerald-400" />{" "}
                                    Reviews
                                </a>
                                <a
                                    href="#"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    <BarChart3 className="size-4" /> Insights
                                </a>
                                <a
                                    href="#"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    <MapPin className="size-4" /> Locations
                                </a>
                                <a
                                    href="#"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    <Settings className="size-4" /> Settings
                                </a>
                            </nav>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 font-mono text-xs">
                            <Link
                                href="/dashboard"
                                className="block w-full py-2 rounded-xl bg-emerald-600 text-white text-center font-bold hover:bg-emerald-500 transition-colors shadow-xs"
                            >
                                Console Dashboard
                            </Link>
                        </div>
                    </aside>

                    {/* Reviews Column */}
                    <section className="w-full lg:w-80 border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col h-full bg-white/50 dark:bg-zinc-900/50 shrink-0">
                        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-display font-medium text-lg text-zinc-950 dark:text-white">
                                    {t("reviewsHeading")}
                                </h3>
                                <span className="font-mono text-[10px] text-amber-900 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                                    {t("needsReplyCount")}
                                </span>
                            </div>

                            <div className="relative">
                                <Search className="size-3.5 absolute left-3 top-2.5 text-zinc-500 dark:text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder={t("searchPlaceholder")}
                                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-body placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-zinc-200/60 dark:divide-zinc-800">
                            {reviews.map((rev) => (
                                <div
                                    key={rev.id}
                                    onClick={() => {
                                        setSelectedReviewId(rev.id);
                                        setIsApproved(false);
                                    }}
                                    className={`p-4 cursor-pointer transition-all ${
                                        selectedReviewId === rev.id
                                            ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600 shadow-xs"
                                            : "hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50"
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-body font-bold text-xs text-zinc-950 dark:text-white">
                                            {rev.name}
                                        </span>
                                        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                            {rev.time}
                                        </span>
                                    </div>

                                    <div className="flex text-amber-500 mb-1.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`size-3 ${i < rev.rating ? "fill-amber-500" : "text-zinc-200 dark:text-zinc-700 fill-zinc-200 dark:fill-zinc-700"}`}
                                            />
                                        ))}
                                    </div>

                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed font-body">
                                        {rev.reviewText}
                                    </p>

                                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                                        <span
                                            className={`px-2 py-0.5 rounded-md font-bold ${
                                                rev.status === "Needs Reply"
                                                    ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                                    : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                            }`}
                                        >
                                            {rev.status}
                                        </span>
                                        <span className="text-zinc-500 dark:text-zinc-400">
                                            {rev.channel}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* AI Workspace */}
                    <section className="flex-1 flex flex-col p-6 bg-white dark:bg-zinc-900 overflow-y-auto justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={selectedReview.avatar}
                                        alt={selectedReview.name}
                                        width={40}
                                        height={40}
                                        className="size-10 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover"
                                        unoptimized
                                    />
                                    <div>
                                        <h4 className="font-display font-medium text-base text-zinc-950 dark:text-white">
                                            {selectedReview.name}
                                        </h4>
                                        <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                            <span>
                                                {selectedReview.channel} Review
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {selectedReview.location}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer">
                                        <Share2 className="size-4" />
                                    </button>
                                    <button className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer">
                                        <MoreHorizontal className="size-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`size-3.5 ${i < selectedReview.rating ? "fill-amber-500" : "text-zinc-200 dark:text-zinc-700 fill-zinc-200 dark:fill-zinc-700"}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                        Verified Customer
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-body italic">
                                    &ldquo;{selectedReview.reviewText}&rdquo;
                                </p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2 font-mono text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                                        <Bot className="size-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>{t("suggestedDraft")}</span>
                                    </div>

                                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl font-mono text-[10px]">
                                        {(
                                            [
                                                "professional",
                                                "empathetic",
                                                "concise",
                                            ] as const
                                        ).map((tone) => (
                                            <button
                                                key={tone}
                                                onClick={() => {
                                                    setActiveTone(tone);
                                                    setIsApproved(false);
                                                }}
                                                className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                                                    activeTone === tone
                                                        ? "bg-white dark:bg-zinc-700 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs"
                                                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                                                }`}
                                            >
                                                {tone}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/80 border border-emerald-300 dark:border-emerald-800 shadow-xs space-y-3 relative">
                                    <textarea
                                        readOnly
                                        value={
                                            selectedReview.aiResponses[
                                                activeTone
                                            ]
                                        }
                                        className="w-full h-36 bg-transparent border-none text-xs text-zinc-900 dark:text-zinc-100 leading-relaxed font-body focus:outline-none resize-none"
                                    />

                                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 font-mono text-xs">
                                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-bold">
                                            {t("seoInjectedBadge")}
                                        </span>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() =>
                                                    setIsApproved(false)
                                                }
                                                className="px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono transition-colors cursor-pointer"
                                            >
                                                {t("discard")}
                                            </button>

                                            <button
                                                onClick={handleApprove}
                                                disabled={isApproved}
                                                className={`px-5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    isApproved
                                                        ? "bg-emerald-600 text-white cursor-default"
                                                        : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/20 active:scale-95"
                                                }`}
                                            >
                                                {isApproved ? (
                                                    <>
                                                        <CheckCircle2 className="size-3.5" />{" "}
                                                        {t(
                                                            "approvedAndPublished",
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>
                                                            {t(
                                                                "approveAndPublish",
                                                            )}
                                                        </span>
                                                        <ArrowRight className="size-3.5" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    );
}
