import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/brand/logo";
import Stars from "@/components/ui/stars";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("NotFound");
    return { title: t("metaTitle") };
}

export default async function NotFound() {
    const t = await getTranslations("NotFound");

    return (
        <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
            <div aria-hidden="true" className="hairline-grid absolute inset-0 -z-10 opacity-60" />
            <Link href="/" className="absolute left-5 top-5 rounded-lg transition-opacity hover:opacity-80 sm:left-8">
                <Logo />
            </Link>

            <Stars value={0} size={18} className="animate-rise" />
            <p
                className="animate-rise mt-4 font-display text-[clamp(7rem,22vw,12rem)] leading-[0.85] tracking-[-0.05em] text-ink"
                style={{ animationDelay: "60ms" }}
            >
                4<em className="text-accent">0</em>4
            </p>
            <h1
                className="animate-rise mt-6 font-display text-[2.2rem] leading-tight tracking-[-0.02em]"
                style={{ animationDelay: "120ms" }}
            >
                {t("title")}
            </h1>
            <p
                className="animate-rise mt-3 max-w-sm text-[15.5px] leading-relaxed text-ink-2"
                style={{ animationDelay: "180ms" }}
            >
                {t("body")}
            </p>
            <Link
                href="/"
                className="btn btn-lg btn-primary animate-rise group mt-8"
                style={{ animationDelay: "240ms" }}
            >
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                {t("home")}
            </Link>
        </main>
    );
}
