import { cn } from "@/lib/cn";

/** The Proficios mark: a reply bubble with a spark inside. */
export function LogoMark({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            className={cn("size-7 shrink-0", className)}
        >
            <rect width="32" height="32" rx="9" className="fill-ink" />
            <path
                d="M11.5 8h9A2.5 2.5 0 0 1 23 10.5v7a2.5 2.5 0 0 1-2.5 2.5h-5.3l-3.7 3.2V20A2.5 2.5 0 0 1 9 17.5v-7A2.5 2.5 0 0 1 11.5 8Z"
                className="fill-canvas"
            />
            <path
                d="m16 10.6 1.05 2.35 2.35 1.05-2.35 1.05L16 17.4l-1.05-2.35-2.35-1.05 2.35-1.05Z"
                className="fill-accent"
            />
        </svg>
    );
}

export default function Logo({
    className,
    showWordmark = true,
}: {
    className?: string;
    showWordmark?: boolean;
}) {
    return (
        <span className={cn("inline-flex items-center gap-2.5", className)}>
            <LogoMark />
            {showWordmark && (
                <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">
                    proficios
                </span>
            )}
        </span>
    );
}
