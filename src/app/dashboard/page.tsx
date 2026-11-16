import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { checkUserEntitlement } from "@/lib/subscriptions";
import DashboardClientView from "./dashboard-client";

interface ReviewRecord {
    id: string;
    location_id: string;
    google_review_id: string;
    author_name: string;
    rating: number;
    comment: string | null;
    status: string;
    review_created_at?: string;
    created_at?: string;
}

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Load actual entitlement state
    const entitlement = await checkUserEntitlement(user.id);

    const { data: locations } = await supabase
        .from("locations")
        .select("*")
        .eq("user_id", user.id);

    let reviews: ReviewRecord[] = [];

    if (locations && locations.length > 0) {
        const locationIds = locations.map((loc) => loc.id);
        const { data: fetchedReviews } = await supabase
            .from("reviews")
            .select("*")
            .in("location_id", locationIds)
            .order("created_at", { ascending: false });

        reviews = (fetchedReviews as ReviewRecord[]) || [];
    }

    return (
        <DashboardClientView
            userId={user.id}
            userEmail={user.email || ""}
            isPro={entitlement.isPro}
            subscriptionPlan={entitlement.plan}
            initialLocations={locations || []}
            initialReviews={reviews}
        />
    );
}
