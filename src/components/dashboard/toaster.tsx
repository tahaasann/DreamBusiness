"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
    id: number;
    kind: ToastKind;
    message: string;
}

/** Small toast queue: success/info disappear after 5 s, errors after 9 s. */
export function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(1);
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    const dismiss = useCallback((id: number) => {
        setToasts((list) => list.filter((toast) => toast.id !== id));
        const timer = timers.current.get(id);
        if (timer) clearTimeout(timer);
        timers.current.delete(id);
    }, []);

    const push = useCallback(
        (kind: ToastKind, message: string) => {
            const id = nextId.current++;
            setToasts((list) => [...list.slice(-2), { id, kind, message }]);
            timers.current.set(
                id,
                setTimeout(() => dismiss(id), kind === "error" ? 9000 : 5000),
            );
        },
        [dismiss],
    );

    useEffect(() => {
        const map = timers.current;
        return () => map.forEach((timer) => clearTimeout(timer));
    }, []);

    return { toasts, push, dismiss };
}

const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
} as const;

export function Toaster({
    toasts,
    onDismiss,
}: {
    toasts: Toast[];
    onDismiss: (id: number) => void;
}) {
    const t = useTranslations("Dashboard");

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end"
        >
            {toasts.map((toast) => {
                const Icon = ICONS[toast.kind];
                return (
                    <div
                        key={toast.id}
                        role={toast.kind === "error" ? "alert" : "status"}
                        className="animate-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-surface py-3 pl-3.5 pr-2 text-[13.5px] shadow-float ring-1 ring-line"
                    >
                        <Icon
                            className={cn(
                                "mt-0.5 size-4 shrink-0",
                                toast.kind === "success" && "text-ok",
                                toast.kind === "error" && "text-bad",
                                toast.kind === "info" && "text-accent",
                            )}
                        />
                        <p className="flex-1 leading-snug text-ink">{toast.message}</p>
                        <button
                            type="button"
                            onClick={() => onDismiss(toast.id)}
                            aria-label={t("dismiss")}
                            className="icon-btn -my-1 size-7 shrink-0"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
