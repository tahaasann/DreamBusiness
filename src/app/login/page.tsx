import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import Logo from "@/components/brand/logo";
import ThemeSwitcher from "@/components/theme-switcher";
import LanguageSwitcher from "@/components/language-switcher";
import Stars from "@/components/ui/stars";
import LoginForm from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Login");
    return { title: t("metaTitle") };
}

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ mode?: string }>;
}) {
    const { mode } = await searchParams;
    const t = await getTranslations("Login");

    return (
        <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            {/* Form side */}
            <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-10">
                <header className="flex items-center justify-between">
                    <Link href="/" className="rounded-lg transition-opacity hover:opacity-80" aria-label={t("backHome")}>
                        <Logo />
                    </Link>
                    <div className="flex items-center gap-1">
                        <ThemeSwitcher />
                        <LanguageSwitcher />
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center py-12">
                    <LoginForm initialMode={mode === "signup" ? "signup" : "signin"} />
                </main>

                <footer className="flex items-center justify-between text-[12.5px] text-ink-3">
                    <Link href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
                        <ArrowLeft className="size-3.5" />
                        {t("backHome")}
                    </Link>
                    <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5" />
                        {t("secured")}
                    </span>
                </footer>
            </div>

            {/* Brand side */}
            <aside className="relative hidden overflow-hidden bg-inverse text-inverse-ink lg:block">
                <div aria-hidden="true" className="absolute inset-0">
                    <div className="absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_55%,transparent),transparent)] opacity-60" />
                    <div className="absolute -bottom-48 -left-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--star)_40%,transparent),transparent)] opacity-40" />
                    <div className="grain absolute inset-0 !opacity-[0.08] !mix-blend-overlay" />
                </div>

                <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
                    <p className="eyebrow !text-inverse-2">Proficios</p>

                    <div className="mx-auto w-full max-w-md">
                        {/* Review → reply vignette */}
                        <div className="animate-float rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/10 backdrop-blur-md dark:bg-black/[0.04] dark:ring-black/10">
                            <div className="flex items-center gap-3">
                                <span className="avatar size-9 text-[12px]" style={{ "--h": 25 } as React.CSSProperties}>
                                    JP
                                </span>
                                <div>
                                    <p className="text-[13.5px] font-medium">Jordan Price</p>
                                    <Stars value={1} size={11} />
                                </div>
                            </div>
                            <p className="mt-3 font-display text-[19px] leading-snug">
                                “Since the last update the app crashes every time I open Reports.”
                            </p>
                            <div className="mt-4 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10 dark:bg-black/[0.04] dark:ring-black/10">
                                <p className="eyebrow !text-inverse-2">Fernly</p>
                                <p className="mt-1.5 text-[13.5px] leading-relaxed text-inverse-ink/85">
                                    Hi Jordan, we’re really sorry. The fix is rolling out today in 4.2.2, and your data is completely safe.
                                </p>
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-2 text-[12px] text-inverse-2">
                                <Stars value={1} size={10} className="opacity-50" />
                                <span aria-hidden="true">→</span>
                                <Stars value={4} size={10} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="max-w-lg font-display text-[2.6rem] leading-[1.05] tracking-[-0.025em]">
                            {t("panelTitle")} <em className="text-accent-inverse">{t("panelTitleAccent")}</em>
                        </h2>
                        <ul className="mt-8 space-y-3 text-[14.5px] text-inverse-ink/85">
                            {(["panelPoint1", "panelPoint2", "panelPoint3"] as const).map((key) => (
                                <li key={key} className="flex items-center gap-3">
                                    <span className="grid size-5 place-items-center rounded-full bg-accent text-accent-ink">
                                        <Check className="size-3" strokeWidth={3} />
                                    </span>
                                    {t(key)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </aside>
        </div>
    );
}
