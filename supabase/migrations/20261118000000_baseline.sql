-- Proficios · baseline · canlı şemanın 2026-11-18 tarihli görüntüsü
--
-- Kaynak: manual/06_export_schema.sql çıktısı (01, 02, 04 ve 05 uygulandıktan sonra).
-- Canlı veritabanı (hrnyzojtdwcnwhaxwnrg) zaten bu durumda; bu dosya oraya
-- UYGULANMAZ. Yeni bir ortam (yerel, staging) kurarken ilk migration olarak çalışır.
--
-- 06 çıktısından farklar (yalnız sıralama ve tamamlayıcılar):
--   * uuid_generate_v7() tablolardan önce tanımlanır, çünkü tablo varsayılanları onu kullanır.
--   * pgcrypto eklentisi açıkça istenir (gen_random_bytes için).
--   * 06 yetkileri yalnız yorum olarak verir; burada canlıdaki yetkileri üreten
--     revoke/grant satırları yazılıdır.
--   * google_oauth_tokens (03) canlıda yok: görev 0.09 ile ertelendi.

create extension if not exists pgcrypto with schema extensions;

-- ── Yardımcı fonksiyon ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.uuid_generate_v7()
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  unix_ts_ms bigint;
  uuid_bytes bytea;
BEGIN
  unix_ts_ms := (floor(extract(epoch from clock_timestamp()) * 1000))::bigint;

  uuid_bytes := set_byte('\x000000000000'::bytea, 0, ((unix_ts_ms >> 40) & 255)::int);
  uuid_bytes := set_byte(uuid_bytes, 1, ((unix_ts_ms >> 32) & 255)::int);
  uuid_bytes := set_byte(uuid_bytes, 2, ((unix_ts_ms >> 24) & 255)::int);
  uuid_bytes := set_byte(uuid_bytes, 3, ((unix_ts_ms >> 16) & 255)::int);
  uuid_bytes := set_byte(uuid_bytes, 4, ((unix_ts_ms >> 8) & 255)::int);
  uuid_bytes := set_byte(uuid_bytes, 5, (unix_ts_ms & 255)::int);

  uuid_bytes := uuid_bytes || gen_random_bytes(10);

  -- Set Version 7 (0111) and Variant 1 (10xx)
  uuid_bytes := set_byte(uuid_bytes, 6, ((get_byte(uuid_bytes, 6) & 15) | 112)::int);
  uuid_bytes := set_byte(uuid_bytes, 8, ((get_byte(uuid_bytes, 8) & 63) | 128)::int);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$function$;

-- ── Tablolar ─────────────────────────────────────────────────────────

create table if not exists public.ai_draft_logs (
    id uuid default uuid_generate_v7() not null,
    review_id uuid,
    prompt_used text,
    selected_tone text not null,
    ai_generated_draft text not null,
    final_published_text text,
    is_edited boolean default false,
    user_rating integer,
    created_at timestamp with time zone default now()
);

create table if not exists public.locations (
    id uuid default uuid_generate_v7() not null,
    user_id uuid,
    google_location_id text not null,
    business_name text not null,
    default_tone text default 'professional'::text,
    created_at timestamp with time zone default now()
);

create table if not exists public.platform_metrics (
    id integer default 1 not null,
    active_storefronts integer default 0,
    reviews_responded integer default 0,
    total_drafts_generated integer default 0,
    unedited_drafts_approved integer default 0,
    updated_at timestamp with time zone default now()
);

create table if not exists public.rate_limit_events (
    id bigint generated always as identity not null,
    user_id uuid not null,
    bucket text not null,
    created_at timestamp with time zone default now() not null
);

create table if not exists public.reviews (
    id uuid default uuid_generate_v7() not null,
    location_id uuid,
    google_review_id text not null,
    author_name text not null,
    rating integer not null,
    comment text,
    status text default 'pending'::text,
    review_created_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

create table if not exists public.subscriptions (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    paddle_customer_id text,
    paddle_subscription_id text,
    paddle_price_id text,
    plan text default 'starter'::text not null,
    status text default 'inactive'::text not null,
    billing_cycle text default 'annual'::text not null,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at timestamp with time zone,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create table if not exists public.webhook_events (
    id uuid default gen_random_uuid() not null,
    paddle_event_id text not null,
    event_type text not null,
    payload jsonb not null,
    processed_at timestamp with time zone default now(),
    status text default 'processed'::text not null,
    error text,
    created_at timestamp with time zone default now()
);

-- ── Kısıtlar ─────────────────────────────────────────────────────────

alter table public.ai_draft_logs add constraint ai_draft_logs_pkey PRIMARY KEY (id);
alter table public.ai_draft_logs add constraint ai_draft_logs_user_rating_check CHECK (((user_rating >= 1) AND (user_rating <= 5)));
alter table public.locations add constraint locations_google_location_id_key UNIQUE (google_location_id);
alter table public.locations add constraint locations_pkey PRIMARY KEY (id);
alter table public.platform_metrics add constraint platform_metrics_pkey PRIMARY KEY (id);
alter table public.platform_metrics add constraint single_row_check CHECK ((id = 1));
alter table public.rate_limit_events add constraint rate_limit_events_pkey PRIMARY KEY (id);
alter table public.reviews add constraint reviews_google_review_id_key UNIQUE (google_review_id);
alter table public.reviews add constraint reviews_pkey PRIMARY KEY (id);
alter table public.reviews add constraint reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
alter table public.reviews add constraint reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'replied'::text])));
alter table public.subscriptions add constraint subscriptions_paddle_subscription_id_key UNIQUE (paddle_subscription_id);
alter table public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table public.subscriptions add constraint subscriptions_user_id_unique UNIQUE (user_id);
alter table public.webhook_events add constraint webhook_events_paddle_event_id_key UNIQUE (paddle_event_id);
alter table public.webhook_events add constraint webhook_events_pkey PRIMARY KEY (id);

alter table public.ai_draft_logs add constraint ai_draft_logs_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;
alter table public.locations add constraint locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.rate_limit_events add constraint rate_limit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.reviews add constraint reviews_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;
alter table public.subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── İndeksler ────────────────────────────────────────────────────────
-- Not: subscriptions ve webhook_events üzerindeki tekrar eden indeksler canlıda var
-- olduğu için burada da duruyor; sonraki migration onları kaldırır.

CREATE INDEX ai_draft_logs_review_id_idx ON public.ai_draft_logs USING btree (review_id);
CREATE INDEX idx_subscriptions_paddle_sub_id ON public.subscriptions USING btree (paddle_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);
CREATE INDEX idx_webhook_events_paddle_event_id ON public.webhook_events USING btree (paddle_event_id);
CREATE INDEX locations_user_id_idx ON public.locations USING btree (user_id);
CREATE INDEX rate_limit_events_lookup_idx ON public.rate_limit_events USING btree (user_id, bucket, created_at DESC);
CREATE INDEX reviews_location_id_idx ON public.reviews USING btree (location_id);
CREATE INDEX subscriptions_paddle_subscription_id_idx ON public.subscriptions USING btree (paddle_subscription_id);
CREATE UNIQUE INDEX subscriptions_user_id_key ON public.subscriptions USING btree (user_id);

-- ── Satır güvenliği (RLS) ────────────────────────────────────────────

alter table public.ai_draft_logs enable row level security;
alter table public.locations enable row level security;
alter table public.platform_metrics enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;

create policy ai_draft_logs_owner_all on public.ai_draft_logs as permissive for all to authenticated
    using ((EXISTS ( SELECT 1
   FROM (public.reviews r
     JOIN public.locations l ON ((l.id = r.location_id)))
  WHERE ((r.id = ai_draft_logs.review_id) AND ((l.user_id)::text = (( SELECT auth.uid() AS uid))::text)))))
    with check ((EXISTS ( SELECT 1
   FROM (public.reviews r
     JOIN public.locations l ON ((l.id = r.location_id)))
  WHERE ((r.id = ai_draft_logs.review_id) AND ((l.user_id)::text = (( SELECT auth.uid() AS uid))::text)))));

create policy locations_owner_all on public.locations as permissive for all to authenticated
    using (((( SELECT auth.uid() AS uid))::text = (user_id)::text))
    with check (((( SELECT auth.uid() AS uid))::text = (user_id)::text));

create policy platform_metrics_public_read on public.platform_metrics as permissive for select to anon, authenticated
    using (true);

create policy reviews_owner_all on public.reviews as permissive for all to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.locations l
  WHERE ((l.id = reviews.location_id) AND ((l.user_id)::text = (( SELECT auth.uid() AS uid))::text)))))
    with check ((EXISTS ( SELECT 1
   FROM public.locations l
  WHERE ((l.id = reviews.location_id) AND ((l.user_id)::text = (( SELECT auth.uid() AS uid))::text)))));

create policy subscriptions_select_own on public.subscriptions as permissive for select to authenticated
    using (((( SELECT auth.uid() AS uid))::text = (user_id)::text));

-- ── Fonksiyonlar ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    v_user uuid := auth.uid();
    v_count integer;
begin
    if v_user is null then
        return false;
    end if;

    -- Yalnız uygulamanın kullandığı kovalar ve makul sınırlar kabul edilir;
    -- böylece fonksiyonu doğrudan çağıran biri tabloyu şişiremez.
    if p_bucket not in ('ai_draft', 'publish_reply', 'google_sync', 'demo_branch')
        or p_limit not between 1 and 1000
        or p_window_seconds not between 1 and 86400 then
        raise exception 'invalid rate limit arguments';
    end if;

    -- Aynı kullanıcı ve kova için eşzamanlı çağrıları sıraya sokar.
    perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_bucket, 0));

    delete from public.rate_limit_events
     where user_id = v_user
       and bucket = p_bucket
       and created_at < now() - make_interval(secs => p_window_seconds);

    select count(*) into v_count
      from public.rate_limit_events
     where user_id = v_user
       and bucket = p_bucket;

    if v_count >= p_limit then
        return false;
    end if;

    insert into public.rate_limit_events (user_id, bucket) values (v_user, p_bucket);
    return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.increment_platform_metrics(p_active_storefronts integer DEFAULT 0, p_total_drafts_generated integer DEFAULT 0, p_reviews_responded integer DEFAULT 0, p_unedited_drafts_approved integer DEFAULT 0)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    -- Tek UPDATE ifadesi satırı kilitler; eşzamanlı artışlar birbirini ezmez.
    update public.platform_metrics
       set active_storefronts = active_storefronts + greatest(p_active_storefronts, 0),
           total_drafts_generated = total_drafts_generated + greatest(p_total_drafts_generated, 0),
           reviews_responded = reviews_responded + greatest(p_reviews_responded, 0),
           unedited_drafts_approved = unedited_drafts_approved + greatest(p_unedited_drafts_approved, 0),
           updated_at = now()
     where id = 1;
$function$;

-- ── Yetkiler (canlıdaki durumu üretir) ───────────────────────────────
-- Supabase yeni tabloları anon ve authenticated'a tam yetkiyle açar; aşağıdakiler
-- 01, 02, 04 ve 05 betiklerinin kaldırdıklarıdır.

revoke all on public.locations, public.reviews, public.ai_draft_logs from anon;
revoke insert, update, delete, truncate on public.platform_metrics from anon, authenticated;
revoke insert, update, delete, truncate on public.subscriptions from anon, authenticated;
revoke select on public.subscriptions from anon;
revoke all on public.webhook_events from anon, authenticated;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

revoke all on function public.increment_platform_metrics(integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.increment_platform_metrics(integer, integer, integer, integer) to service_role;

-- Tek satırlık sayaç tablosu.
insert into public.platform_metrics (id) values (1) on conflict (id) do nothing;
