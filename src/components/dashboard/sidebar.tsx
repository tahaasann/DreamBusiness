"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, Crown, Inbox, KeyRound, Loader2, LogOut, Plus, Sparkles } from "lucide-react";
import Logo from "@/components/brand/logo";
import ThemeSwitcher from "@/components/theme-switcher";
import LanguageSwitcher from "@/components/language-switcher";
import { cn } from "@/lib/cn";
import { hueFor, initialsFor, type AppItem, type CredentialItem } from "./helpers";

export interface SidebarProps {
    apps: AppItem[];
    pendingByApp: Record<string, number>;
    activeAppId: string | null;
    onSelectApp: (id: string) => void;
    onAddDemo: () => void;
    addingDemo: boolean;
    credentials: CredentialItem[];
    onConnect: () => void;
    onManageConnection: () => void;
    isPro: boolean;
    onUpgrade: () => void;
    userEmail: string;
    totalPending: number;
}

export function AppAvatar({ name, className }: { name: string; className?: string }) {
    return (
        <span
            className={cn("avatar size-7 rounded-[0.55rem] text-[10.5px]", className)}
            style={{ "--h": hueFor(name) } as React.CSSProperties}
            aria-hidden="true"
        >
            {initialsFor(name)}
        </span>
    );
}

export function PlanCard({ isPro, onUpgrade }: { isPro: boolean; onUpgrade: () => void }) {
    const t = useTranslations("Dashboard");

    if (isPro) {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-[13px] font-medium text-accent">
                <Crown className="size-4" />
                {t("proActive")}
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-surface p-4 shadow-card ring-1 ring-line">
            <div
                aria-hidden="true"
                className="absolute -right-8 -top-10 size-28 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_22%,transparent),transparent)]"
            />
            <p className="relative flex items-center gap-1.5 text-[13.5px] font-semibold tracking-tight">
                <Sparkles className="size-3.5 text-accent" />
                {t("upgradeTitle")}
            </p>
            <p className="relative mt-1 text-[12.5px] leading-snug text-ink-3">{t("upgradeBody")}</p>
            <button type="button" onClick={onUpgrade} className="btn btn-sm btn-primary relative mt-3 w-full">
                {t("upgrade")}
            </button>
        </div>
    );
}

export default function Sidebar({
    apps,
    pendingByApp,
    activeAppId,
    onSelectApp,
    onAddDemo,
    addingDemo,
    credentials,
    onConnect,
    onManageConnection,
    isPro,
    onUpgrade,
    userEmail,
    totalPending,
}: SidebarProps) {
    const t = useTranslations("Dashboard");

    return (
        <aside className="hidden w-[16.5rem] shrink-0 flex-col border-r border-line bg-subtle/70 lg:flex">
            <div className="flex h-16 items-center px-5">
                <Link href="/" className="rounded-lg transition-opacity hover:opacity-80" aria-label={t("backToSite")}>
                    <Logo />
                </Link>
            </div>

            <nav className="thin-scrollbar flex-1 overflow-y-auto px-3 pb-4">
                <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 text-[13.5px] font-medium text-ink shadow-xs ring-1 ring-line">
                    <Inbox className="size-4 text-ink-2" strokeWidth={1.75} />
                    {t("inbox")}
                    {totalPending > 0 && (
                        <span className="ml-auto rounded-full bg-accent px-1.5 py-px text-[11px] font-semibold text-accent-ink tabular">
                            {totalPending}
                        </span>
                    )}
                </div>

                <p className="eyebrow mb-2 mt-7 px-3">{t("apps")}</p>
                <ul className="space-y-0.5">
                    {apps.map((app) => {
                        const active = app.id === activeAppId;
                        const pending = pendingByApp[app.id] ?? 0;
                        return (
                            <li key={app.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelectApp(app.id)}
                                    aria-current={active}
                                    className={cn(
                                        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-colors",
                                        active ? "bg-hover font-medium text-ink" : "text-ink-2 hover:bg-hover/60 hover:text-ink",
                                    )}
                                >
                                    <AppAvatar name={app.display_name} />
                                    <span className="min-w-0 flex-1 truncate">{app.display_name}</span>
                                    {app.is_demo && (
                                        <span className="rounded bg-line px-1 py-px text-[10px] font-medium uppercase tracking-wide text-ink-3">
                                            {t("demoBadge")}
                                        </span>
                                    )}
                                    {!app.is_demo && (app.last_sync_error || !app.credential_id) && (
                                        <AlertTriangle className="size-3.5 text-warn" aria-label={t("syncProblem")} />
                                    )}
                                    {pending > 0 && (
                                        <span className="text-[11.5px] text-ink-3 tabular">{pending}</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <button
                    type="button"
                    onClick={onConnect}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                    <span className="grid size-7 place-items-center rounded-[0.55rem] bg-accent-soft">
                        <Plus className="size-3.5" />
                    </span>
                    {credentials.length ? t("addApp") : t("connectPlay")}
                </button>

                <button
                    type="button"
                    onClick={onAddDemo}
                    disabled={addingDemo}
                    className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] text-ink-3 transition-colors hover:bg-hover/60 hover:text-ink disabled:opacity-60"
                >
                    <span className="grid size-7 place-items-center rounded-[0.55rem] border border-dashed border-line-strong">
                        {addingDemo ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    </span>
                    {addingDemo ? t("addingDemoApp") : t("addDemoApp")}
                </button>

                {credentials.length > 0 && (
                    <>
                        <p className="eyebrow mb-2 mt-7 px-3">{t("connection")}</p>
                        <button
                            type="button"
                            onClick={onManageConnection}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-ink-2 transition-colors hover:bg-hover/60 hover:text-ink"
                        >
                            <span className="grid size-7 shrink-0 place-items-center rounded-[0.55rem] ring-1 ring-line">
                                <KeyRound className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate" title={credentials[0].service_account_email}>
                                    {credentials[0].service_account_email}
                                </span>
                                <span className={cn("block text-[11px]", credentials[0].last_error ? "text-warn" : "text-ok")}>
                                    {credentials[0].last_error ? t("connectionProblem") : t("connectionOk")}
                                </span>
                            </span>
                        </button>
                    </>
                )}
            </nav>

            <div className="space-y-3 border-t border-line p-3">
                <PlanCard isPro={isPro} onUpgrade={onUpgrade} />

                <div className="flex items-center gap-2.5 px-1.5">
                    <span className="avatar size-8 text-[12px]" style={{ "--h": hueFor(userEmail) } as React.CSSProperties}>
                        {(userEmail[0] ?? "?").toLocaleUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink" title={userEmail}>
                            {userEmail}
                        </p>
                        <p className="text-[11.5px] text-ink-3">{isPro ? t("proActive") : t("planFree")}</p>
                    </div>
                    <form action="/auth/signout" method="post">
                        <button type="submit" className="icon-btn size-8" aria-label={t("signOut")} title={t("signOut")}>
                            <LogOut className="size-4" strokeWidth={1.75} />
                        </button>
                    </form>
                </div>

                <div className="flex items-center gap-1 px-0.5">
                    <ThemeSwitcher />
                    <LanguageSwitcher variant="full" placement="top" className="flex-1" />
                </div>
            </div>
        </aside>
    );
}
