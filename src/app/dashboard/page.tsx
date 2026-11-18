import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkUserEntitlement } from "@/lib/subscriptions";
import {
    APP_COLUMNS,
    CREDENTIAL_COLUMNS,
    REVIEW_COLUMNS,
    type AppItem,
    type CredentialItem,
    type ReviewItem,
} from "@/lib/play/types";
import DashboardClientView from "./dashboard-client";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Dashboard");
    return { title: t("metaTitle") };
}

/** Enough for a busy app: Play itself only returns the last week of reviews per sync. */
const REVIEW_LIMIT = 1000;

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [entitlement, apps, reviews, credentials] = await Promise.all([
        checkUserEntitlement(user.id),
        supabase.from("apps").select(APP_COLUMNS).eq("user_id", user.id).order("created_at"),
        supabase
            .from("app_reviews")
            .select(REVIEW_COLUMNS)
            .eq("user_id", user.id)
            .order("review_updated_at", { ascending: false, nullsFirst: false })
            .limit(REVIEW_LIMIT),
        supabase.from("store_credentials").select(CREDENTIAL_COLUMNS).eq("user_id", user.id).order("created_at"),
    ]);

    return (
        <DashboardClientView
            userId={user.id}
            userEmail={user.email || ""}
            isPro={entitlement.isPro}
            initialApps={(apps.data ?? []) as unknown as AppItem[]}
            initialReviews={(reviews.data ?? []) as unknown as ReviewItem[]}
            initialCredentials={(credentials.data ?? []) as unknown as CredentialItem[]}
        />
    );
}
