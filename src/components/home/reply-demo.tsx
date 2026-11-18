"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
    ArrowRight,
    Check,
    Languages,
    Loader2,
    Pause,
    Play,
    Smartphone,
    Sparkles,
} from "lucide-react";
import Stars from "@/components/ui/stars";
import { cn } from "@/lib/cn";

type Tone = "professional" | "friendly" | "apologetic" | "casual";

interface Scene {
    id: string;
    name: string;
    initials: string;
    hue: number;
    rating: number;
    newRating: number;
    minutesAgo: number;
    device: string;
    language: string;
    tone: Tone;
    review: string;
    reply: string;
}

const APP_NAME = "Fernly";
const LIMIT = 350;
const LANG_CODES: Record<string, string> = {
    English: "en",
    Deutsch: "de",
    Türkçe: "tr",
    Português: "pt",
};

// Reviews stay in their original language on purpose: replying in the
// reviewer's own language is the point of the demo.
const SCENES: Scene[] = [
    {
        id: "jordan",
        name: "Jordan Price",
        initials: "JP",
        hue: 25,
        rating: 1,
        newRating: 4,
        minutesAgo: 2,
        device: "Pixel 8 · v4.2.1",
        language: "English",
        tone: "apologetic",
        review: "Since the last update the app crashes every time I open Reports. I've used it daily for two years, please fix this.",
        reply: "Hi Jordan, we're really sorry. That crash came from 4.2.1 and the fix is rolling out today in 4.2.2. Your data and streak are completely safe. Thank you for sticking with us for two years; we'd love to hear how it feels once you've updated.",
    },
    {
        id: "lena",
        name: "Lena Wagner",
        initials: "LW",
        hue: 300,
        rating: 2,
        newRating: 5,
        minutesAgo: 14,
        device: "Galaxy Tab S9 · v4.2.1",
        language: "Deutsch",
        tone: "friendly",
        review: "Die Synchronisierung mit meinem Tablet funktioniert seit Tagen nicht. Schade, sonst wirklich eine tolle App!",
        reply: "Hallo Lena, danke für dein ehrliches Feedback! Meist hilft Einstellungen → Konto → Neu verbinden. Klappt das nicht, schreib uns über Hilfe → Kontakt. Wir schauen uns dein Konto persönlich an und melden uns noch heute.",
    },
    {
        id: "elif",
        name: "Elif Kaya",
        initials: "EK",
        hue: 160,
        rating: 3,
        newRating: 4,
        minutesAgo: 52,
        device: "Redmi Note 13 · v4.2.0",
        language: "Türkçe",
        tone: "professional",
        review: "Uygulama çok güzel ama abonelik fiyatı biraz yüksek. Öğrenci indirimi olsa harika olurdu.",
        reply: "Merhaba Elif, değerlendirmeniz için teşekkür ederiz. Öğrenci indirimi önerinizi ürün ekibimize ilettik. Bu arada yıllık planda aylık maliyet %40 daha düşük; Ayarlar → Abonelik bölümünden inceleyebilirsiniz. Geri bildirimleriniz Fernly'yi daha iyi yapıyor.",
    },
    {
        id: "rafael",
        name: "Rafael Souza",
        initials: "RS",
        hue: 220,
        rating: 5,
        newRating: 5,
        minutesAgo: 180,
        device: "Galaxy S24 · v4.2.1",
        language: "Português",
        tone: "casual",
        review: "Melhor app de finanças que já usei. Simples, bonito e me ajudou a economizar de verdade!",
        reply: "Valeu demais, Rafael! Saber que o Fernly está te ajudando a economizar é exatamente o que a gente queria. Se tiver uma ideia para o próximo update, manda pra gente pelo app. Estamos sempre ouvindo!",
    },
];

type Phase = "review" | "analyze" | "draft" | "ready" | "posting" | "done";

const T_REVIEW = 700;
const T_TYPING_START = 1500;
const CHARS_PER_MS = 0.12;
const HOLD_READY = 850;
const POSTING = 900;
const HOLD_DONE = 2800;

function timeline(scene: Scene) {
    const typingEnd = T_TYPING_START + scene.reply.length / CHARS_PER_MS;
    const readyEnd = typingEnd + HOLD_READY;
    const postingEnd = readyEnd + POSTING;
    return { typingEnd, readyEnd, postingEnd, end: postingEnd + HOLD_DONE };
}

function derive(scene: Scene, elapsed: number): { phase: Phase; typed: number } {
    const full = scene.reply.length;
    const tl = timeline(scene);
    if (elapsed < T_REVIEW) return { phase: "review", typed: 0 };
    if (elapsed < T_TYPING_START) return { phase: "analyze", typed: 0 };
    if (elapsed < tl.typingEnd)
        return {
            phase: "draft",
            typed: Math.min(full, Math.floor((elapsed - T_TYPING_START) * CHARS_PER_MS)),
        };
    if (elapsed < tl.readyEnd) return { phase: "ready", typed: full };
    if (elapsed < tl.postingEnd) return { phase: "posting", typed: full };
    return { phase: "done", typed: full };
}

const subscribeMotion = (cb: () => void) => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
};
function usePrefersReducedMotion() {
    return useSyncExternalStore(
        subscribeMotion,
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        () => false,
    );
}

function useRelativeTime() {
    const locale = useLocale();
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
    return (minutes: number) =>
        minutes < 60 ? rtf.format(-minutes, "minute") : rtf.format(-Math.round(minutes / 60), "hour");
}

function CounterRing({ value, max }: { value: number; max: number }) {
    const r = 7;
    const c = 2 * Math.PI * r;
    const ratio = Math.min(1, value / max);
    return (
        <svg viewBox="0 0 18 18" className="size-[18px] -rotate-90" aria-hidden="true">
            <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2" className="stroke-line-strong" />
            <circle
                cx="9"
                cy="9"
                r={r}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${ratio * c} ${c}`}
                className={cn(ratio > 0.86 ? "stroke-warn" : "stroke-accent")}
            />
        </svg>
    );
}

export default function ReplyDemo() {
    const t = useTranslations("Demo");
    const tTone = useTranslations("Tones");
    const relative = useRelativeTime();
    const reduced = usePrefersReducedMotion();

    const [sceneIndex, setSceneIndex] = useState(0);
    const [live, setLive] = useState<{ phase: Phase; typed: number }>({
        phase: "review",
        typed: 0,
    });
    const [userPaused, setUserPaused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [inView, setInView] = useState(false);

    const rootRef = useRef<HTMLDivElement>(null);
    const elapsedRef = useRef(0);
    const pausedRef = useRef(false);

    useEffect(() => {
        pausedRef.current = userPaused || hovered || !inView;
    }, [userPaused, hovered, inView]);

    useEffect(() => {
        const node = rootRef.current;
        if (!node) return;
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
            threshold: 0.25,
        });
        io.observe(node);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (reduced) return;
        const scene = SCENES[sceneIndex];
        const total = timeline(scene).end;
        let raf = 0;
        let last = performance.now();

        const loop = (now: number) => {
            const dt = Math.min(now - last, 64);
            last = now;
            if (!pausedRef.current) elapsedRef.current += dt;

            if (elapsedRef.current >= total) {
                elapsedRef.current = 0;
                setLive({ phase: "review", typed: 0 });
                setSceneIndex((i) => (i + 1) % SCENES.length);
                return;
            }

            const next = derive(scene, elapsedRef.current);
            setLive((prev) =>
                prev.phase === next.phase && prev.typed === next.typed ? prev : next,
            );
            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [sceneIndex, reduced]);

    const goTo = (index: number) => {
        elapsedRef.current = 0;
        setLive({ phase: "review", typed: 0 });
        setSceneIndex(index);
    };

    const scene = SCENES[sceneIndex];
    const { phase, typed } = reduced
        ? { phase: "done" as Phase, typed: scene.reply.length }
        : live;

    const isReplied = (i: number) => i < sceneIndex || (i === sceneIndex && phase === "done");
    const pending = SCENES.filter((_, i) => !isReplied(i)).length;
    const showAnalysis = phase !== "review";
    const ratingNow = phase === "done" ? scene.newRating : scene.rating;
    const improved = scene.newRating > scene.rating;

    return (
        <div
            ref={rootRef}
            className="relative"
            onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
            onPointerLeave={() => setHovered(false)}
        >
            <div className="relative">
            <div className="relative overflow-hidden rounded-[22px] bg-surface text-left shadow-window ring-1 ring-line">
                {/* Window chrome */}
                <div className="flex h-11 items-center gap-3 border-b border-line bg-subtle px-4">
                    <div className="flex gap-1.5" aria-hidden="true">
                        <span className="size-2.5 rounded-full bg-line-strong" />
                        <span className="size-2.5 rounded-full bg-line-strong" />
                        <span className="size-2.5 rounded-full bg-line-strong" />
                    </div>
                    <div className="mx-auto flex min-w-0 items-center gap-2 truncate font-mono text-[11.5px] text-ink-3">
                        <span className="hidden size-1.5 shrink-0 rounded-full bg-ok sm:inline-block" />
                        <span className="truncate">{t("windowTitle", { app: APP_NAME })}</span>
                    </div>
                    <div className="w-[42px]" aria-hidden="true" />
                </div>

                <div className="grid md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                    {/* Queue */}
                    <aside className="hidden border-r border-line bg-subtle/40 md:block">
                        <div className="flex items-center justify-between px-4 pb-2 pt-4">
                            <span className="text-[13px] font-semibold tracking-tight">{t("inbox")}</span>
                            <span
                                className={cn(
                                    "rounded-full px-2 py-0.5 text-[11px] font-medium tabular transition-colors",
                                    pending > 0 ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok",
                                )}
                            >
                                {pending > 0 ? t("needsReply", { count: pending }) : t("allReplied")}
                            </span>
                        </div>
                        <ul className="space-y-0.5 px-2 pb-3">
                            {SCENES.map((s, i) => {
                                const active = i === sceneIndex;
                                const replied = isReplied(i);
                                return (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            onClick={() => goTo(i)}
                                            aria-current={active}
                                            aria-label={t("showExample", { n: i + 1 })}
                                            className={cn(
                                                "relative w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                                                active ? "bg-surface shadow-card ring-1 ring-line" : "hover:bg-hover",
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className="avatar size-7 text-[10.5px]"
                                                    style={{ "--h": s.hue } as React.CSSProperties}
                                                >
                                                    {s.initials}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="truncate text-[12.5px] font-medium">{s.name}</span>
                                                        <span className="shrink-0 text-[10.5px] text-ink-3 tabular">
                                                            {relative(s.minutesAgo)}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 flex items-center gap-1.5">
                                                        <Stars value={replied ? s.newRating : s.rating} size={10.5} />
                                                        {replied && (
                                                            <span className="animate-fade inline-flex items-center gap-0.5 text-[10.5px] font-medium text-ok">
                                                                <Check className="size-3" strokeWidth={2.5} />
                                                                {t("replied")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mt-1.5 line-clamp-1 pl-[38px] text-[11.5px] text-ink-3">
                                                {s.review}
                                            </p>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </aside>

                    {/* Detail */}
                    <div key={scene.id} className="animate-fade min-w-0 p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <span
                                className="avatar size-10 text-[13px]"
                                style={{ "--h": scene.hue } as React.CSSProperties}
                            >
                                {scene.initials}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                    <span className="text-[14.5px] font-semibold tracking-tight">{scene.name}</span>
                                    <Stars value={ratingNow} size={13} />
                                    <span className="text-[12px] text-ink-3">{relative(scene.minutesAgo)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
                                    <span className="inline-flex items-center gap-1">
                                        <Smartphone className="size-3" />
                                        {scene.device}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Languages className="size-3" />
                                        {scene.language}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p
                            lang={LANG_CODES[scene.language] ?? "en"}
                            className="mt-4 font-display text-[19px] leading-[1.35] tracking-[-0.01em] text-ink sm:text-[22px]"
                        >
                            “{scene.review}”
                        </p>

                        <div className="mt-5 flex min-h-7 flex-wrap items-center gap-2">
                            {showAnalysis && (
                                <>
                                    <span className="animate-pop inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent">
                                        <Sparkles className="size-3" />
                                        {t("detected", { language: scene.language })}
                                    </span>
                                    <span
                                        className="animate-pop inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-[11.5px] font-medium text-ink-2 ring-1 ring-line"
                                        style={{ animationDelay: "120ms" }}
                                    >
                                        {t("toneLabel", { tone: tTone(scene.tone) })}
                                    </span>
                                </>
                            )}
                        </div>

                        <div
                            className="ai-border mt-3 rounded-2xl"
                            data-active={phase === "draft" || phase === "analyze"}
                        >
                            <div className="rounded-2xl bg-subtle ring-1 ring-line">
                                <div className="flex items-center justify-between px-4 pt-3">
                                    <span className="eyebrow">{t("replyAs", { app: APP_NAME })}</span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-3 tabular">
                                        <CounterRing value={typed} max={LIMIT} />
                                        {typed}/{LIMIT}
                                    </span>
                                </div>

                                <div className="min-h-[7.25rem] px-4 pb-3 pt-2 text-[13.5px] leading-relaxed text-ink sm:min-h-[6.5rem]">
                                    {phase === "review" && (
                                        <span className="text-ink-3">{t("waiting")}</span>
                                    )}
                                    {phase === "analyze" && (
                                        <div className="space-y-2 pt-1" aria-label={t("drafting")}>
                                            <div className="shimmer h-3 w-11/12 rounded-full" />
                                            <div className="shimmer h-3 w-9/12 rounded-full" />
                                            <div className="shimmer h-3 w-10/12 rounded-full" />
                                        </div>
                                    )}
                                    {(phase === "draft" || phase === "ready" || phase === "posting" || phase === "done") && (
                                        <p className={cn(phase === "draft" && "caret")}>
                                            {scene.reply.slice(0, typed)}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                                    <span className="truncate text-[11.5px] text-ink-3">
                                        {phase === "analyze" || phase === "draft" ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Loader2 className="size-3 animate-spin" />
                                                {t("drafting")}
                                            </span>
                                        ) : phase === "done" ? (
                                            t("liveOnPlay")
                                        ) : (
                                            t("waitsForYou")
                                        )}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[0.6rem] px-3 text-[12.5px] font-medium transition-all duration-300",
                                            phase === "done"
                                                ? "bg-ok-soft text-ok"
                                                : phase === "ready" || phase === "posting"
                                                  ? "bg-inverse text-inverse-ink"
                                                  : "bg-line text-ink-3",
                                            phase === "ready" && "animate-pulse-ring",
                                            phase === "posting" && "scale-[0.97]",
                                        )}
                                    >
                                        {phase === "posting" ? (
                                            <>
                                                <Loader2 className="size-3.5 animate-spin" />
                                                {t("posting")}
                                            </>
                                        ) : phase === "done" ? (
                                            <>
                                                <Check className="size-3.5" strokeWidth={2.5} />
                                                {t("posted")}
                                            </>
                                        ) : (
                                            t("approve")
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Outcome toast */}
            <div aria-live="polite" className="pointer-events-none">
                {phase === "done" && (
                    <div
                        key={`toast-${scene.id}`}
                        className="animate-pop absolute -bottom-6 left-1/2 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-float ring-1 ring-line sm:left-auto sm:right-6 sm:translate-x-0"
                    >
                        <span
                            className="avatar size-8 text-[11px]"
                            style={{ "--h": scene.hue } as React.CSSProperties}
                        >
                            {scene.initials}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-medium">
                                {improved
                                    ? t("ratingUpdated", { name: scene.name.split(" ")[0] })
                                    : t("notified", { name: scene.name.split(" ")[0] })}
                            </p>
                            {improved ? (
                                <div className="mt-0.5 flex items-center gap-1.5">
                                    <Stars value={scene.rating} size={11} className="opacity-50" />
                                    <ArrowRight className="size-3 text-ink-3" />
                                    <Stars value={scene.newRating} size={11} />
                                </div>
                            ) : (
                                <p className="text-[11.5px] text-ink-3">{t("liveOnPlay")}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
            </div>

            {/* Controls */}
            <div className="mt-12 flex items-center justify-center gap-2">
                {SCENES.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={t("showExample", { n: i + 1 })}
                        aria-current={i === sceneIndex}
                        className="group grid h-6 place-items-center px-1"
                    >
                        <span
                            className={cn(
                                "block h-1.5 rounded-full transition-all duration-500",
                                i === sceneIndex ? "w-6 bg-ink" : "w-1.5 bg-line-strong group-hover:bg-ink-3",
                            )}
                        />
                    </button>
                ))}
                {!reduced && (
                    <button
                        type="button"
                        onClick={() => setUserPaused((v) => !v)}
                        aria-label={userPaused ? t("play") : t("pause")}
                        className="icon-btn ml-1 size-7"
                    >
                        {userPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                    </button>
                )}
            </div>
        </div>
    );
}
