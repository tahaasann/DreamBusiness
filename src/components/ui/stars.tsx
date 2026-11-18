import { cn } from "@/lib/cn";

const STAR_PATH =
    "M10 1.6l2.47 5.18 5.68.7-4.18 3.9 1.07 5.62L10 14.24 4.96 17l1.07-5.62L1.85 7.48l5.68-.7L10 1.6z";

/** Five-star rating. Filled stars transition when the value changes. */
export default function Stars({
    value,
    size = 14,
    className,
    label,
}: {
    value: number;
    size?: number;
    className?: string;
    label?: string;
}) {
    const rounded = Math.max(0, Math.min(5, Math.round(value)));
    return (
        <span
            role="img"
            aria-label={label ?? `${rounded} / 5`}
            className={cn("inline-flex items-center gap-[2px]", className)}
        >
            {[1, 2, 3, 4, 5].map((i) => (
                <svg
                    key={i}
                    viewBox="0 0 20 20"
                    width={size}
                    height={size}
                    aria-hidden="true"
                    className={cn(
                        "transition-[fill,transform] duration-500",
                        i <= rounded ? "fill-star" : "fill-line-strong",
                    )}
                    style={{ transitionDelay: `${(i - 1) * 70}ms` }}
                >
                    <path d={STAR_PATH} />
                </svg>
            ))}
        </span>
    );
}
