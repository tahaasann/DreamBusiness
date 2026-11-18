"use client";

import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

interface ViewTransitionDocument {
    startViewTransition?: (callback: () => void) => { ready: Promise<void> };
}

function applyTheme(next: Theme) {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
        localStorage.setItem("theme", next);
    } catch {
        // Private mode or blocked storage: the theme still applies for this visit.
    }
}

/**
 * Switches light/dark. Where the browser supports View Transitions the new
 * theme spreads out in a circle from the button that was pressed.
 */
export default function ThemeSwitcher({ className }: { className?: string }) {
    const t = useTranslations("Common");

    const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const next: Theme = document.documentElement.classList.contains("dark")
            ? "light"
            : "dark";
        const doc = document as unknown as ViewTransitionDocument;
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (!doc.startViewTransition || reduceMotion) {
            applyTheme(next);
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y),
        );

        const transition = doc.startViewTransition(() => applyTheme(next));
        transition.ready
            .then(() => {
                document.documentElement.animate(
                    {
                        clipPath: [
                            `circle(0px at ${x}px ${y}px)`,
                            `circle(${radius}px at ${x}px ${y}px)`,
                        ],
                    },
                    {
                        duration: 520,
                        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                        pseudoElement: "::view-transition-new(root)",
                    },
                );
            })
            .catch(() => {});
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={t("toggleTheme")}
            title={t("toggleTheme")}
            className={cn("icon-btn", className)}
        >
            <Moon className="size-[17px] dark:hidden" strokeWidth={1.75} />
            <Sun className="hidden size-[17px] dark:block" strokeWidth={1.75} />
        </button>
    );
}
