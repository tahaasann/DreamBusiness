"use client";

import { useState, useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

const emptySubscribe = () => () => {};

// Isolated DOM theme application helper
function applyThemeToDOM(nextTheme: "light" | "dark"): void {
    if (typeof document !== "undefined") {
        localStorage.setItem("theme", nextTheme);
        if (nextTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }
}

// React 18/19 idiom: Detect hydration synchronously
function useHydrated(): boolean {
    return useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );
}

// React 18/19 idiom: Read localStorage state synchronously
function useStoredTheme(): "light" | "dark" {
    return useSyncExternalStore(
        emptySubscribe,
        () => {
            if (typeof window === "undefined") return "light";
            const saved = localStorage.getItem("theme");
            if (
                saved === "dark" ||
                document.documentElement.classList.contains("dark")
            ) {
                return "dark";
            }
            return "light";
        },
        () => "light",
    );
}

export default function ThemeSwitcher() {
    const isMounted = useHydrated();
    const storedTheme = useStoredTheme();
    const [localTheme, setLocalTheme] = useState<"light" | "dark" | null>(null);

    const activeTheme = localTheme || storedTheme;

    const toggleTheme = () => {
        const nextTheme = activeTheme === "dark" ? "light" : "dark";
        applyThemeToDOM(nextTheme);
        setLocalTheme(nextTheme);
    };

    if (!isMounted) {
        return (
            <div className="size-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600">
                <Sun className="size-4" />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="size-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
            {activeTheme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
            ) : (
                <Moon className="size-4 text-zinc-700" />
            )}
        </button>
    );
}
