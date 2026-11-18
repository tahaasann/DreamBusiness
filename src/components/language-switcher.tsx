"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

// Native names, no flags: languages are not countries.
export const LANGUAGES = [
    { code: "en-US", label: "English (US)", short: "EN" },
    { code: "en-GB", label: "English (UK)", short: "EN-GB" },
    { code: "de", label: "Deutsch", short: "DE" },
    { code: "es", label: "Español", short: "ES" },
    { code: "fr", label: "Français", short: "FR" },
    { code: "it", label: "Italiano", short: "IT" },
    { code: "pt", label: "Português", short: "PT" },
    { code: "tr", label: "Türkçe", short: "TR" },
] as const;

function setLocaleCookie(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher({
    variant = "compact",
    placement = "bottom",
    className,
}: {
    variant?: "compact" | "full";
    placement?: "bottom" | "top";
    className?: string;
}) {
    const t = useTranslations("Common");
    const router = useRouter();
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();

    const currentCode = locale === "en" ? "en-US" : locale;
    const current =
        LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0];

    useEffect(() => {
        if (!open) return;
        const onPointer = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointer);
        return () => document.removeEventListener("pointerdown", onPointer);
    }, [open]);

    useEffect(() => {
        if (open) {
            listRef.current
                ?.querySelectorAll<HTMLElement>("[role=option]")
                [activeIndex]?.focus();
        }
    }, [open, activeIndex]);

    const openMenu = () => {
        setActiveIndex(
            Math.max(
                0,
                LANGUAGES.findIndex((l) => l.code === current.code),
            ),
        );
        setOpen(true);
    };

    const choose = (code: string) => {
        setOpen(false);
        buttonRef.current?.focus();
        if (code === current.code) return;
        setLocaleCookie(code);
        startTransition(() => router.refresh());
    };

    const onListKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => (i + 1) % LANGUAGES.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length);
        } else if (event.key === "Home") {
            event.preventDefault();
            setActiveIndex(0);
        } else if (event.key === "End") {
            event.preventDefault();
            setActiveIndex(LANGUAGES.length - 1);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            buttonRef.current?.focus();
        } else if (event.key === "Tab") {
            setOpen(false);
        }
    };

    return (
        <div ref={rootRef} className={cn("relative", className)}>
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={`${t("language")}: ${current.label}`}
                onClick={() => (open ? setOpen(false) : openMenu())}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        openMenu();
                    }
                }}
                className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-[0.7rem] px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink",
                    variant === "full" && "w-full justify-between",
                    open && "bg-hover text-ink",
                )}
            >
                <span className="inline-flex items-center gap-1.5">
                    {isPending ? (
                        <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
                    ) : (
                        <Globe className="size-4" strokeWidth={1.75} />
                    )}
                    <span className={cn(variant === "compact" && "font-mono text-[12px] tracking-wide")}>
                        {variant === "compact" ? current.short : current.label}
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        "size-3.5 opacity-60 transition-transform duration-200",
                        open && "rotate-180",
                    )}
                />
            </button>

            {open && (
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    aria-label={t("language")}
                    onKeyDown={onListKeyDown}
                    className={cn(
                        "animate-pop absolute z-50 min-w-48 rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-line",
                        placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
                        variant === "full" ? "left-0 w-full" : "right-0",
                    )}
                >
                    {LANGUAGES.map((lang, index) => {
                        const selected = lang.code === current.code;
                        return (
                            <li
                                key={lang.code}
                                role="option"
                                aria-selected={selected}
                                tabIndex={index === activeIndex ? 0 : -1}
                                lang={lang.code}
                                onClick={() => choose(lang.code)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        choose(lang.code);
                                    }
                                }}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={cn(
                                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13.5px] outline-none transition-colors",
                                    index === activeIndex ? "bg-hover text-ink" : "text-ink-2",
                                    selected && "font-medium text-ink",
                                )}
                            >
                                <span>{lang.label}</span>
                                {selected && <Check className="size-4 text-accent" />}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
