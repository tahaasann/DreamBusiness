import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { checkUserEntitlement } from "@/lib/subscriptions";
import type { ReviewItem } from "@/components/dashboard/helpers";
import DashboardClientView from "./dashboard-client";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Dashboard");
    return { title: t("metaTitle") };
}

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const entitlement = await checkUserEntitlement(user.id);

    const { data: locations } = await supabase
        .from("locations")
        .select("*")
        .eq("user_id", user.id);

    let reviews: ReviewItem[] = [];

    if (locations && locations.length > 0) {
        const locationIds = locations.map((loc) => loc.id);
        const { data: fetchedReviews } = await supabase
            .from("reviews")
            .select("*")
            .in("location_id", locationIds)
            .order("created_at", { ascending: false });

        reviews = (fetchedReviews as ReviewItem[]) || [];
    }

    return (
        <DashboardClientView
            userId={user.id}
            userEmail={user.email || ""}
            isPro={entitlement.isPro}
            initialLocations={locations || []}
            initialReviews={reviews}
        />
    );
}
