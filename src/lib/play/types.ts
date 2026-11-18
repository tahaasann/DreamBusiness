// Shared by server code (queries) and the dashboard (rendering). No 'use client' here:
// constants exported from a client module would not be plain strings on the server.

/** A row of public.apps as the dashboard reads it. */
export interface AppItem {
    id: string;
    display_name: string;
    package_name: string;
    default_tone: string;
    is_demo: boolean;
    credential_id: string | null;
    last_synced_at: string | null;
    last_sync_error: string | null;
    created_at?: string;
}

/** A row of public.app_reviews as the dashboard reads it. */
export interface ReviewItem {
    id: string;
    app_id: string;
    store_review_id: string;
    author_name: string | null;
    star_rating: number;
    review_text: string | null;
    reviewer_language: string | null;
    app_version_name: string | null;
    app_version_code: number | null;
    device: string | null;
    android_os_version: number | null;
    thumbs_up_count: number;
    review_updated_at: string | null;
    developer_reply_text: string | null;
    developer_reply_updated_at: string | null;
    status: string;
    created_at?: string;
}

/** Non-secret columns of public.store_credentials (the key itself is never sent). */
export interface CredentialItem {
    id: string;
    service_account_email: string;
    last_verified_at: string | null;
    last_error: string | null;
}

export const APP_COLUMNS =
    "id, display_name, package_name, default_tone, is_demo, credential_id, last_synced_at, last_sync_error, created_at";
export const REVIEW_COLUMNS =
    "id, app_id, store_review_id, author_name, star_rating, review_text, reviewer_language, app_version_name, app_version_code, device, android_os_version, thumbs_up_count, review_updated_at, developer_reply_text, developer_reply_updated_at, status, created_at";
export const CREDENTIAL_COLUMNS = "id, service_account_email, last_verified_at, last_error";
