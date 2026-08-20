"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import CountUp from "@/components/home/count-up";
import {
    getPublicMetrics,
    PublicMetrics,
} from "@/app/actions/get-public-metrics";
import { Building2, MessageSquareCheck, TrendingUp } from "lucide-react";

export default function MetricCards() {
    const t = useTranslations("Metrics");
    const [metrics, setMetrics] = useState<PublicMetrics>({
        activeStorefronts: 0,
        reviewsResponded: 0,
        aiApprovalRate: 100,
    });

    useEffect(() => {
        getPublicMetrics().then((data) => {
            if (data) setMetrics(data);
        });
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-6xl mx-auto px-4 sm:px-6 pt-12">
            <div className="liquid-glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Building2 className="size-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        {t("verifiedTrust")}
                    </span>
                </div>
                <div className="font-display font-light text-4xl sm:text-5xl tracking-tight text-zinc-950 dark:text-white mb-1">
                    <CountUp end={metrics.activeStorefronts} />
                </div>
                <div className="font-body font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                    {t("activeStorefronts")}
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-body">
                    {t("activeDesc")}
                </p>
            </div>

            <div className="liquid-glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <MessageSquareCheck className="size-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        {t("subsecondAi")}
                    </span>
                </div>
                <div className="font-display font-light text-4xl sm:text-5xl tracking-tight text-zinc-950 dark:text-white mb-1">
                    <CountUp end={metrics.reviewsResponded} />
                </div>
                <div className="font-body font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                    {t("reviewsResponded")}
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-body">
                    {t("reviewsDesc")}
                </p>
            </div>

            <div className="liquid-glass-card group p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="size-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        {t("rank1Impact")}
                    </span>
                </div>
                <div className="font-display font-light text-4xl sm:text-5xl tracking-tight text-zinc-950 dark:text-white mb-1">
                    <CountUp end={metrics.aiApprovalRate} suffix="%" />
                </div>
                <div className="font-body font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                    {t("localPackBoost")}
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-body">
                    {t("boostDesc")}
                </p>
            </div>
        </div>
    );
}
