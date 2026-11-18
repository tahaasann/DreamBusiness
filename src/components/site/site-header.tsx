"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "@/components/brand/logo";
import ThemeSwitcher from "@/components/theme-switcher";
import LanguageSwitcher from "@/components/language-switcher";
import { cn } from "@/lib/cn";

const LINKS = [
    { href: "#how", key: "how" },
    { href: "#features", key: "features" },
    { href: "#pricing", key: "pricing" },
    { href: "#faq", key: "faq" },
] as const;

export default function SiteHeader() {
    const t = useTranslations("Nav");
    const tc = useTranslations("Common");
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const onResize = () => window.innerWidth >= 768 && setOpen(false);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", onResize);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", onResize);
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <header
            className={cn(
                "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
                scrolled || open
                    ? "border-line bg-canvas/80 backdrop-blur-xl backdrop-saturate-150"
                    : "border-transparent",
            )}
        >
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8">
                <Link
                    href="/"
                    aria-label={tc("home")}
                    className="rounded-lg transition-opacity hover:opacity-80"
                >
                    <Logo />
                </Link>

                <nav aria-label={tc("mainNav")} className="hidden items-center gap-1 md:flex">
                    {LINKS.map((link) => (
                        <a
                            key={link.key}
                            href={link.href}
                            className="rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-hover hover:text-ink"
                        >
                            {t(link.key)}
                        </a>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-1">
                    <ThemeSwitcher />
                    <LanguageSwitcher className="hidden sm:block" />
                    <span className="mx-2 hidden h-5 w-px bg-line sm:block" />
                    <Link href="/login" className="btn btn-sm btn-ghost hidden sm:inline-flex">
                        {t("signIn")}
                    </Link>
                    <Link href="/login?mode=signup" className="btn btn-sm btn-primary group hidden sm:inline-flex">
                        {t("getStarted")}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <button
                        type="button"
                        className="icon-btn md:hidden"
                        aria-expanded={open}
                        aria-controls="mobile-nav"
                        aria-label={open ? tc("closeMenu") : tc("openMenu")}
                        onClick={() => setOpen((v) => !v)}
                    >
                        {open ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>
                </div>
            </div>

            {open && (
                <div
                    id="mobile-nav"
                    className="animate-fade h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-canvas px-5 pb-10 pt-4 md:hidden"
                >
                    <nav aria-label={tc("mainNav")} className="flex flex-col">
                        {LINKS.map((link, i) => (
                            <a
                                key={link.key}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="animate-rise border-b border-line py-4 font-display text-3xl tracking-tight text-ink"
                                style={{ animationDelay: `${i * 40}ms` }}
                            >
                                {t(link.key)}
                            </a>
                        ))}
                    </nav>
                    <div className="mt-8 grid gap-3">
                        <Link href="/login?mode=signup" className="btn btn-lg btn-primary">
                            {t("getStarted")}
                            <ArrowRight className="size-4" />
                        </Link>
                        <Link href="/login" className="btn btn-lg btn-secondary">
                            {t("signIn")}
                        </Link>
                    </div>
                    <div className="mt-6">
                        <LanguageSwitcher variant="full" />
                    </div>
                </div>
            )}
        </header>
    );
}
