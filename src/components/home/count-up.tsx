"use client";

import { useState, useEffect, useRef } from "react";

interface CountUpProps {
    end: number;
    suffix?: string;
    prefix?: string;
    duration?: number;
    decimals?: number;
}

export default function CountUp({
    end,
    suffix = "",
    prefix = "",
    duration = 2000,
    decimals = 0,
}: CountUpProps) {
    const [count, setCount] = useState<number>(0);
    const [hasAnimated, setHasAnimated] = useState<boolean>(false);
    const countRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    let startTimestamp: number | null = null;

                    const step = (timestamp: number) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min(
                            (timestamp - startTimestamp) / duration,
                            1,
                        );
                        const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
                        setCount(easeProgress * end);

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };

                    window.requestAnimationFrame(step);
                }
            },
            { threshold: 0.3 },
        );

        if (countRef.current) {
            observer.observe(countRef.current);
        }

        return () => observer.disconnect();
    }, [end, duration, hasAnimated]);

    const formattedCount =
        decimals > 0
            ? count.toFixed(decimals)
            : Math.floor(count).toLocaleString();

    return (
        <span ref={countRef}>
            {prefix}
            {formattedCount}
            {suffix}
        </span>
    );
}
