import { useTranslations } from "next-intl";
import { Languages, ShieldCheck, Type, UserCheck } from "lucide-react";

const ITEMS = [
    { key: "api", Icon: ShieldCheck },
    { key: "languages", Icon: Languages },
    { key: "limit", Icon: Type },
    { key: "approval", Icon: UserCheck },
] as const;

export default function ProofStrip() {
    const t = useTranslations("Proof");

    return (
        <section aria-label={t("label")} className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line md:grid-cols-4">
                {ITEMS.map(({ key, Icon }) => (
                    <li key={key} className="bg-canvas p-5 sm:p-6">
                        <Icon className="size-[18px] text-accent" strokeWidth={1.75} />
                        <p className="mt-3 text-[14.5px] font-semibold tracking-tight text-ink">
                            {t(`${key}Title`)}
                        </p>
                        <p className="mt-1 text-[13px] leading-snug text-ink-3">{t(`${key}Body`)}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
