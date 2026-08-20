"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/language-switcher";
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
    const t = useTranslations("Login");
    const router = useRouter();
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const supabase = createClient();

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        if (mode === "signup") {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
                },
            });
            if (error) setErrorMsg(error.message);
            else {
                router.push("/dashboard");
                router.refresh();
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) setErrorMsg(error.message);
            else {
                router.push("/dashboard");
                router.refresh();
            }
        }
        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
                scopes: "https://www.googleapis.com/auth/business.manage",
                queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        });
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />

            <header className="relative z-10 max-w-6xl mx-auto w-full flex justify-between items-center py-4">
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-90 transition cursor-pointer"
                >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <span>Proficios</span>
                </Link>
                <LanguageSwitcher />
            </header>

            <main className="relative z-10 max-w-md mx-auto w-full my-auto space-y-6">
                <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            {t("title")}
                        </h1>
                        <p className="text-xs text-slate-400">
                            {t("subtitle")}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700/40 text-xs font-semibold">
                        <button
                            onClick={() => {
                                setMode("signin");
                                setErrorMsg(null);
                            }}
                            className={`py-2 rounded-lg transition cursor-pointer ${mode === "signin" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
                        >
                            {t("signInTab")}
                        </button>
                        <button
                            onClick={() => {
                                setMode("signup");
                                setErrorMsg(null);
                            }}
                            className={`py-2 rounded-lg transition cursor-pointer ${mode === "signup" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"}`}
                        >
                            {t("signUpTab")}
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form
                        onSubmit={handleEmailAuth}
                        className="space-y-4 text-xs"
                    >
                        <div>
                            <label className="block text-slate-300 font-medium mb-1">
                                {t("emailLabel")}
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t("emailPlaceholder")}
                                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 pl-9 pr-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-300 font-medium mb-1">
                                {t("passwordLabel")}
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder={t("passwordPlaceholder")}
                                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl py-2.5 pl-9 pr-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs shadow-lg shadow-indigo-600/20"
                        >
                            <span>
                                {isLoading
                                    ? t("submitting")
                                    : mode === "signin"
                                      ? t("signInTab")
                                      : t("signUpTab")}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    <div className="relative flex items-center justify-center">
                        <div className="border-t border-slate-700/60 w-full" />
                        <span className="bg-slate-800 px-3 text-[10px] text-slate-400 uppercase font-semibold shrink-0">
                            {t("orSocial")}
                        </span>
                        <div className="border-t border-slate-700/60 w-full" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-3 text-xs cursor-pointer shadow-md"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                        </svg>
                        <span>{t("googleBtn")}</span>
                    </button>
                </div>
            </main>

            <footer className="relative z-10 text-center text-[11px] text-slate-500 py-4">
                Protected by Supabase Auth & Row Level Security
            </footer>
        </div>
    );
}
