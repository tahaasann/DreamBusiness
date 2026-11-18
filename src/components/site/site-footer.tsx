import Link from "next/link";
import { useTranslations } from "next-intl";
import Logo from "@/components/brand/logo";

export default function SiteFooter() {
    const t = useTranslations("Footer");
    const tn = useTranslations("Nav");
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-line">
            <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
                <div className="space-y-4">
                    <Logo />
                    <p className="max-w-xs font-display text-2xl leading-snug tracking-tight text-ink-2">
                        {t("tagline")}
                    </p>
                </div>

                <div>
                    <p className="eyebrow mb-4">{t("product")}</p>
                    <ul className="space-y-2.5 text-[14px]">
                        <li><a className="text-ink-2 transition-colors hover:text-ink" href="#how">{tn("how")}</a></li>
                        <li><a className="text-ink-2 transition-colors hover:text-ink" href="#features">{tn("features")}</a></li>
                        <li><a className="text-ink-2 transition-colors hover:text-ink" href="#pricing">{tn("pricing")}</a></li>
                        <li><a className="text-ink-2 transition-colors hover:text-ink" href="#faq">{tn("faq")}</a></li>
                    </ul>
                </div>

                <div>
                    <p className="eyebrow mb-4">{t("account")}</p>
                    <ul className="space-y-2.5 text-[14px]">
                        <li><Link className="text-ink-2 transition-colors hover:text-ink" href="/login">{tn("signIn")}</Link></li>
                        <li><Link className="text-ink-2 transition-colors hover:text-ink" href="/login?mode=signup">{t("createAccount")}</Link></li>
                    </ul>
                </div>
            </div>

            <div className="border-t border-line">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[12.5px] text-ink-3 sm:px-8 md:flex-row md:items-center md:justify-between">
                    <p>{t("rights", { year })}</p>
                    <p className="max-w-xl md:text-right">{t("trademark")}</p>
                </div>
            </div>
        </footer>
    );
}
