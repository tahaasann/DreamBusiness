import { useTranslations } from "next-intl";
import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import Hero from "@/components/home/hero";
import ProofStrip from "@/components/home/proof-strip";
import WhyReply from "@/components/home/why-reply";
import HowItWorks from "@/components/home/how-it-works";
import Features from "@/components/home/features";
import Pricing from "@/components/home/pricing";
import Faq from "@/components/home/faq";
import FinalCta from "@/components/home/final-cta";

export default function Home() {
    const t = useTranslations("Common");

    return (
        <>
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas"
            >
                {t("skipToContent")}
            </a>
            <SiteHeader />
            <main id="main" className="overflow-x-clip">
                <Hero />
                <ProofStrip />
                <WhyReply />
                <HowItWorks />
                <Features />
                <Pricing />
                <Faq />
                <FinalCta />
            </main>
            <SiteFooter />
        </>
    );
}
