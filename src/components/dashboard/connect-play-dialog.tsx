"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    ExternalLink,
    FileJson,
    KeyRound,
    Loader2,
    ShieldCheck,
    Trash2,
    UploadCloud,
    X,
} from "lucide-react";
import { addPlayApp, connectPlayAccount } from "@/app/actions/play";
import { disconnectPlayAccount } from "@/app/actions/play-apps";
import { cn } from "@/lib/cn";
import type { AppItem, CredentialItem, ReviewItem } from "./helpers";

export type ConnectMode = "connect" | "add" | "manage";
type Step = "guide" | "upload" | "app" | "manage";

const MAX_FILE_BYTES = 16 * 1024;
const PACKAGE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

const LINKS = {
    api: "https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com",
    serviceAccounts: "https://console.cloud.google.com/iam-admin/serviceaccounts",
    playUsers: "https://play.google.com/console/developers/users-and-permissions",
};

interface ConnectPlayDialogProps {
    open: boolean;
    mode: ConnectMode;
    credential: CredentialItem | null;
    onClose: () => void;
    onCredentialSaved: (credential: CredentialItem) => void;
    onAppAdded: (app: AppItem, reviews: ReviewItem[], note: string | null) => void;
    onDisconnected: (credentialId: string, removedAppIds: string[]) => void;
}

function ExternalStepLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
        >
            {children}
            <ExternalLink className="size-3" aria-hidden="true" />
        </a>
    );
}

function ErrorNote({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <p role="alert" className="animate-pop flex items-start gap-2 rounded-xl bg-bad-soft px-3.5 py-3 text-[13px] leading-snug text-bad">
            <AlertCircle className="mt-px size-4 shrink-0" />
            <span>{message}</span>
        </p>
    );
}

export default function ConnectPlayDialog({
    open,
    mode,
    credential,
    onClose,
    onCredentialSaved,
    onAppAdded,
    onDisconnected,
}: ConnectPlayDialogProps) {
    const t = useTranslations("Connect");
    const dialogRef = useRef<HTMLDialogElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const titleId = useId();
    const packageId = useId();
    const nameId = useId();

    const initialStep: Step = mode === "manage" ? "manage" : mode === "add" && credential ? "app" : "guide";
    const [step, setStep] = useState<Step>(initialStep);
    const [file, setFile] = useState<{ name: string; text: string } | null>(null);
    const [dragging, setDragging] = useState(false);
    const [packageName, setPackageName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [removeData, setRemoveData] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset whenever the dialog is opened again.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            setStep(initialStep);
            setFile(null);
            setPackageName("");
            setDisplayName("");
            setRemoveData(false);
            setError(null);
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open, initialStep]);

    const go = (next: Step) => {
        setError(null);
        setStep(next);
    };

    const readFile = async (picked: File | undefined) => {
        setError(null);
        if (!picked) return;
        if (picked.size > MAX_FILE_BYTES) {
            setError(t("fileTooLarge"));
            return;
        }
        setFile({ name: picked.name, text: await picked.text() });
    };

    const saveKey = async () => {
        if (!file) return;
        setBusy(true);
        setError(null);
        const result = await connectPlayAccount(file.text);
        setBusy(false);
        if (!result.success) {
            setError(result.error);
            return;
        }
        onCredentialSaved(result.credential);
        setFile(null);
        go("app");
    };

    const packageValid = PACKAGE_PATTERN.test(packageName.trim());

    const addApp = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!credential || !packageValid || !displayName.trim()) return;
        setBusy(true);
        setError(null);
        const result = await addPlayApp({
            credentialId: credential.id,
            packageName: packageName.trim(),
            displayName: displayName.trim(),
        });
        setBusy(false);
        if (!result.success) {
            setError(result.error);
            return;
        }
        if (result.app) {
            const note = result.initialSync.ok ? null : (result.initialSync.error ?? null);
            onAppAdded(result.app, result.reviews, note);
        }
        onClose();
    };

    const disconnect = async () => {
        if (!credential) return;
        setBusy(true);
        setError(null);
        const result = await disconnectPlayAccount(credential.id, { removeData });
        setBusy(false);
        if (!result.success) {
            setError(result.error);
            return;
        }
        onDisconnected(credential.id, result.removedAppIds);
        onClose();
    };

    const stepIndex = { guide: 0, upload: 1, app: 2, manage: -1 }[step];

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            onClose={onClose}
            onCancel={(event) => {
                if (busy) event.preventDefault();
            }}
            onClick={(event) => {
                if (event.target === dialogRef.current && !busy) onClose();
            }}
            className="m-auto w-[min(36rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-[1.4rem] bg-surface p-0 text-ink shadow-window ring-1 ring-line backdrop:bg-ink/30 backdrop:backdrop-blur-[3px] open:animate-pop"
        >
            <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
                <header className="flex items-start gap-3 border-b border-line px-6 pb-4 pt-5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                        {step === "manage" ? <KeyRound className="size-5" /> : <ShieldCheck className="size-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id={titleId} className="text-[17px] font-semibold tracking-tight">
                            {step === "manage" ? t("manageTitle") : step === "app" ? t("appTitle") : t("title")}
                        </h2>
                        {stepIndex >= 0 && mode === "connect" && (
                            <ol className="mt-2 flex items-center gap-1.5" aria-label={t("progress")}>
                                {[t("stepGuide"), t("stepUpload"), t("stepApp")].map((label, index) => (
                                    <li key={label} className="flex items-center gap-1.5 text-[11.5px]">
                                        <span
                                            className={cn(
                                                "grid size-5 place-items-center rounded-full text-[10.5px] font-semibold tabular",
                                                index < stepIndex
                                                    ? "bg-ok text-surface"
                                                    : index === stepIndex
                                                      ? "bg-accent text-accent-ink"
                                                      : "bg-subtle text-ink-3 ring-1 ring-line",
                                            )}
                                            aria-current={index === stepIndex ? "step" : undefined}
                                        >
                                            {index < stepIndex ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                                        </span>
                                        <span className={index === stepIndex ? "font-medium text-ink" : "text-ink-3"}>{label}</span>
                                        {index < 2 && <span className="mx-0.5 h-px w-4 bg-line-strong" aria-hidden="true" />}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                    <button type="button" onClick={onClose} disabled={busy} className="icon-btn -mr-2 size-9" aria-label={t("close")}>
                        <X className="size-4" />
                    </button>
                </header>

                <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    {step === "guide" && (
                        <div className="space-y-4 text-[14px] leading-relaxed text-ink-2">
                            <p>{t("guideIntro")}</p>
                            <ol className="space-y-3">
                                {[
                                    { title: t("guide1Title"), body: t("guide1Body"), link: LINKS.api, linkLabel: t("guide1Link") },
                                    { title: t("guide2Title"), body: t("guide2Body"), link: LINKS.serviceAccounts, linkLabel: t("guide2Link") },
                                    { title: t("guide3Title"), body: t("guide3Body"), link: LINKS.playUsers, linkLabel: t("guide3Link") },
                                ].map((item, index) => (
                                    <li key={item.title} className="flex gap-3 rounded-2xl bg-subtle/70 p-3.5 ring-1 ring-line">
                                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface font-mono text-[12px] font-semibold text-ink shadow-xs ring-1 ring-line">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="font-medium text-ink">{item.title}</p>
                                            <p className="mt-1 text-[13px]">{item.body}</p>
                                            <p className="mt-1.5 text-[13px]">
                                                <ExternalStepLink href={item.link}>{item.linkLabel}</ExternalStepLink>
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-[12.5px] text-ink-2">{t("guideDelay")}</p>
                        </div>
                    )}

                    {step === "upload" && (
                        <div className="space-y-4">
                            <p className="text-[14px] leading-relaxed text-ink-2">{t("uploadIntro")}</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setDragging(false);
                                    void readFile(event.dataTransfer.files[0]);
                                }}
                                className={cn(
                                    "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                                    dragging ? "border-accent bg-accent-soft" : file ? "border-ok/50 bg-ok-soft/50" : "border-line-strong hover:border-accent/60 hover:bg-subtle",
                                )}
                            >
                                {file ? (
                                    <>
                                        <FileJson className="size-7 text-ok" strokeWidth={1.5} />
                                        <span className="text-[14px] font-medium text-ink">{file.name}</span>
                                        <span className="text-[12px] text-ink-3">{t("chooseAnother")}</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="size-7 text-ink-3" strokeWidth={1.5} />
                                        <span className="text-[14px] font-medium text-ink">{t("dropFile")}</span>
                                        <span className="text-[12px] text-ink-3">{t("fileHint")}</span>
                                    </>
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/json,.json"
                                className="sr-only"
                                tabIndex={-1}
                                onChange={(event) => {
                                    void readFile(event.target.files?.[0]);
                                    event.target.value = "";
                                }}
                            />
                            <p className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-3">
                                <ShieldCheck className="mt-px size-4 shrink-0 text-ok" />
                                {t("keySafety")}
                            </p>
                            <ErrorNote message={error} />
                        </div>
                    )}

                    {step === "app" && (
                        <form id="add-app-form" onSubmit={addApp} className="space-y-4">
                            {credential && (
                                <p className="flex items-center gap-2 rounded-xl bg-ok-soft px-3.5 py-2.5 text-[13px] text-ok">
                                    <Check className="size-4 shrink-0" />
                                    <span className="min-w-0 truncate">
                                        {t("connectedAs", { email: credential.service_account_email })}
                                    </span>
                                </p>
                            )}
                            <div className="space-y-1.5">
                                <label htmlFor={packageId} className="text-[13px] font-medium text-ink-2">
                                    {t("packageLabel")}
                                </label>
                                <input
                                    id={packageId}
                                    value={packageName}
                                    onChange={(event) => setPackageName(event.target.value)}
                                    placeholder="com.example.app"
                                    autoComplete="off"
                                    spellCheck={false}
                                    required
                                    aria-invalid={packageName.length > 0 && !packageValid}
                                    className="field font-mono text-[14px]"
                                />
                                <p className={cn("text-[12px]", packageName && !packageValid ? "text-bad" : "text-ink-3")}>
                                    {packageName && !packageValid ? t("packageInvalid") : t("packageHint")}
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor={nameId} className="text-[13px] font-medium text-ink-2">
                                    {t("nameLabel")}
                                </label>
                                <input
                                    id={nameId}
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    placeholder={t("namePlaceholder")}
                                    maxLength={100}
                                    required
                                    className="field"
                                />
                            </div>
                            <ErrorNote message={error} />
                        </form>
                    )}

                    {step === "manage" && credential && (
                        <div className="space-y-4 text-[14px]">
                            <dl className="space-y-2 rounded-2xl bg-subtle/70 p-4 ring-1 ring-line">
                                <div>
                                    <dt className="eyebrow">{t("serviceAccount")}</dt>
                                    <dd className="mt-0.5 break-all font-mono text-[13px] text-ink">{credential.service_account_email}</dd>
                                </div>
                                <div>
                                    <dt className="eyebrow">{t("status")}</dt>
                                    <dd className={cn("mt-0.5 text-[13px]", credential.last_error ? "text-warn" : "text-ok")}>
                                        {credential.last_error ?? t("statusOk")}
                                    </dd>
                                </div>
                            </dl>
                            <button type="button" onClick={() => go("upload")} className="btn btn-secondary w-full">
                                <UploadCloud className="size-4" />
                                {t("replaceKey")}
                            </button>
                            <div className="rounded-2xl p-4 ring-1 ring-bad/25">
                                <p className="font-medium text-ink">{t("disconnectTitle")}</p>
                                <p className="mt-1 text-[13px] text-ink-2">{t("disconnectBody")}</p>
                                <label className="mt-3 flex items-start gap-2.5 text-[13px] text-ink-2">
                                    <input
                                        type="checkbox"
                                        checked={removeData}
                                        onChange={(event) => setRemoveData(event.target.checked)}
                                        className="mt-0.5 size-4 accent-[var(--bad)]"
                                    />
                                    {t("removeData")}
                                </label>
                            </div>
                            <ErrorNote message={error} />
                        </div>
                    )}
                </div>

                <footer className="flex items-center gap-2 border-t border-line bg-subtle/50 px-6 py-3.5">
                    {step === "upload" && mode !== "manage" && (
                        <button
                            type="button"
                            onClick={() => go(mode === "add" && credential ? "app" : "guide")}
                            disabled={busy}
                            className="btn btn-ghost -ml-3"
                        >
                            <ArrowLeft className="size-4" />
                            {t("back")}
                        </button>
                    )}
                    {step === "upload" && mode === "manage" && (
                        <button type="button" onClick={() => go("manage")} disabled={busy} className="btn btn-ghost -ml-3">
                            <ArrowLeft className="size-4" />
                            {t("back")}
                        </button>
                    )}
                    {step === "app" && mode === "add" && (
                        <button type="button" onClick={() => go("upload")} disabled={busy} className="btn btn-ghost -ml-3 text-[13px]">
                            {t("useOtherKey")}
                        </button>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {step === "guide" && (
                            <button type="button" onClick={() => go("upload")} className="btn btn-primary group">
                                {t("haveKey")}
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                            </button>
                        )}
                        {step === "upload" && (
                            <button type="button" onClick={saveKey} disabled={!file || busy} className="btn btn-primary">
                                {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                                {busy ? t("verifying") : t("verifyKey")}
                            </button>
                        )}
                        {step === "app" && (
                            <button
                                type="submit"
                                form="add-app-form"
                                disabled={busy || !packageValid || !displayName.trim()}
                                className="btn btn-primary"
                            >
                                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                {busy ? t("checkingApp") : t("addApp")}
                            </button>
                        )}
                        {step === "manage" && (
                            <button type="button" onClick={disconnect} disabled={busy} className="btn bg-bad text-surface hover:opacity-90">
                                {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                {t("disconnect")}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </dialog>
    );
}
