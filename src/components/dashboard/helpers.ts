"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";

export interface AppItem {
    id: string;
    user_id?: string;
    google_location_id: string;
    business_name: string;
    default_tone?: string;
    created_at?: string;
}

export interface ReviewItem {
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

export const isReplied = (review: ReviewItem) => review.status === "replied";
export const isLiveReview = (review: ReviewItem) => review.google_review_id.startsWith("accounts/");
export const reviewTime = (review: ReviewItem) =>
    review.review_created_at ?? review.created_at ?? "";

/** Stable hue (0–359) for tinting avatars from a name. */
export function hueFor(name: string): number {
    let hash = 7;
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
    return hash;
}

export function initialsFor(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
    return letters.toLocaleUpperCase();
}

// A shared clock that ticks every 30 seconds while something on screen uses it.
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribeClock(callback: () => void) {
    if (listeners.size === 0) {
        now = Date.now();
        timer = setInterval(() => {
            now = Date.now();
            listeners.forEach((listener) => listener());
        }, 30_000);
    }
    listeners.add(callback);
    return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && timer) {
            clearInterval(timer);
            timer = undefined;
        }
    };
}

// Cached between calls, as useSyncExternalStore requires.
function readClock(): number {
    if (!now) now = Date.now();
    return now;
}

/**
 * Returns a formatter for "3 min ago" style labels in the UI language.
 * Renders an empty string on the server so hydration never mismatches.
 */
export function useRelativeTime() {
    const locale = useLocale();
    const current = useSyncExternalStore(subscribeClock, readClock, () => 0);

    return (iso: string): string => {
        if (!current || !iso) return "";
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) return "";
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
        const seconds = Math.round((then - current) / 1000);
        const abs = Math.abs(seconds);
        if (abs < 45) return rtf.format(0, "second");
        if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
        if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
        if (abs < 604_800) return rtf.format(Math.round(seconds / 86_400), "day");
        if (abs < 2_629_800) return rtf.format(Math.round(seconds / 604_800), "week");
        if (abs < 31_557_600) return rtf.format(Math.round(seconds / 2_629_800), "month");
        return rtf.format(Math.round(seconds / 31_557_600), "year");
    };
}
