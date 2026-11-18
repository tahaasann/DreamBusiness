"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";

/**
 * Where Supabase sends the user back after Google sign-in or email confirmation.
 * Always the address the page was opened on, so local logins stay on localhost
 * and production logins stay on the live domain, whatever NEXT_PUBLIC_SITE_URL says.
 */
function authCallbackUrl(): string {
    return `${window.location.origin}/auth/callback`;
}

function GoogleIcon() {
    return (
        <svg className="size-[18px]" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
    );
}

export default function LoginForm({ initialMode }: { initialMode: Mode }) {
    const t = useTranslations("Login");
    const router = useRouter();
    const [mode, setMode] = useState<Mode>(initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState<"email" | "google" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);
    const emailId = useId();
    const passwordId = useId();
    const errorId = useId();

    const switchMode = (next: Mode) => {
        setMode(next);
        setError(null);
        const url = new URL(window.location.href);
        if (next === "signup") url.searchParams.set("mode", "signup");
        else url.searchParams.delete("mode");
        window.history.replaceState(null, "", url);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy("email");
        setError(null);
        const supabase = createClient();

        try {
            if (mode === "signup") {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: authCallbackUrl() },
                });
                if (signUpError) {
                    setError(signUpError.message);
                } else if (data.session) {
                    router.push("/dashboard");
                    router.refresh();
                    return;
                } else {
                    // Email confirmation is on: there is no session until the link is opened.
                    setConfirmationSentTo(email);
                }
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) {
                    setError(signInError.message);
                } else {
                    router.push("/dashboard");
                    router.refresh();
                    return;
                }
            }
        } catch {
            setError(t("genericError"));
        }
        setBusy(null);
    };

    const handleGoogle = async () => {
        setBusy("google");
        setError(null);
        const supabase = createClient();
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: authCallbackUrl(),
                scopes: "https://www.googleapis.com/auth/business.manage",
                queryParams: { access_type: "offline", prompt: "consent" },
            },
        });
        if (oauthError) {
            setError(oauthError.message);
            setBusy(null);
        }
    };

    if (confirmationSentTo) {
        return (
            <div className="animate-rise text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <MailCheck className="size-6" strokeWidth={1.75} />
                </span>
                <h1 className="mt-6 font-display text-[2.6rem] leading-none tracking-[-0.025em]">
                    {t("checkInboxTitle")}
                </h1>
                <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
                    {t("checkInboxBody", { email: confirmationSentTo })}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setConfirmationSentTo(null);
                        setPassword("");
                    }}
                    className="btn btn-secondary mt-8"
                >
                    {t("useDifferentEmail")}
                </button>
            </div>
        );
    }

    const isSignup = mode === "signup";

    return (
        <div>
            <h1 key={`title-${mode}`} className="animate-fade font-display text-[2.75rem] leading-none tracking-[-0.025em]">
                {isSignup ? t("titleSignUp") : t("titleSignIn")}
            </h1>
            <p key={`sub-${mode}`} className="animate-fade mt-3 text-[15px] text-ink-2">
                {isSignup ? t("subtitleSignUp") : t("subtitleSignIn")}
            </p>

            <div role="tablist" aria-label={t("tabSignIn")} className="relative mt-8 grid grid-cols-2 rounded-xl bg-subtle p-1 ring-1 ring-line">
                <span
                    aria-hidden="true"
                    className={cn(
                        "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[0.6rem] bg-surface shadow-card ring-1 ring-line transition-transform duration-300 ease-[var(--ease-out-expo)]",
                        isSignup && "translate-x-full",
                    )}
                />
                {(["signin", "signup"] as const).map((item) => (
                    <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={mode === item}
                        onClick={() => switchMode(item)}
                        className={cn(
                            "relative z-10 h-9 rounded-[0.6rem] text-[13.5px] font-medium transition-colors",
                            mode === item ? "text-ink" : "text-ink-3 hover:text-ink",
                        )}
                    >
                        {item === "signin" ? t("tabSignIn") : t("tabSignUp")}
                    </button>
                ))}
            </div>

            <button
                type="button"
                onClick={handleGoogle}
                disabled={busy !== null}
                className="btn btn-lg btn-secondary mt-6 w-full"
            >
                {busy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
                {t("google")}
            </button>

            <div className="my-6 flex items-center gap-4 text-[12px] text-ink-3">
                <span className="h-px flex-1 bg-line" />
                {t("or")}
                <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? errorId : undefined}>
                <div className="space-y-1.5">
                    <label htmlFor={emailId} className="text-[13px] font-medium text-ink-2">
                        {t("email")}
                    </label>
                    <input
                        id={emailId}
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("emailPlaceholder")}
                        className="field"
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor={passwordId} className="text-[13px] font-medium text-ink-2">
                        {t("password")}
                    </label>
                    <div className="relative">
                        <input
                            id={passwordId}
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={6}
                            autoComplete={isSignup ? "new-password" : "current-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={isSignup ? t("passwordNewPlaceholder") : t("passwordPlaceholder")}
                            className="field pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                            aria-pressed={showPassword}
                            className="icon-btn absolute right-1 top-1/2 size-9 -translate-y-1/2"
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                </div>

                <div aria-live="assertive">
                    {error && (
                        <p
                            id={errorId}
                            className="animate-pop flex items-start gap-2 rounded-xl bg-bad-soft px-3.5 py-3 text-[13px] text-bad"
                        >
                            <AlertCircle className="mt-px size-4 shrink-0" />
                            <span>{error}</span>
                        </p>
                    )}
                </div>

                <button type="submit" disabled={busy !== null} className="btn btn-lg btn-primary group w-full">
                    {busy === "email" ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            {t("submitting")}
                        </>
                    ) : (
                        <>
                            {isSignup ? t("submitSignUp") : t("submitSignIn")}
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
