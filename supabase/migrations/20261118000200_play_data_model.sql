-- Proficios · Faz 1 · Google Play veri modeli (görevler 1.01–1.07)
--
-- Ne yapar:
--   * store_credentials  Kullanıcının Google Play servis hesabı anahtarı (şifreli).
--   * apps               Kullanıcının bağladığı uygulamalar (paket adı başına bir satır).
--   * app_reviews        Play'den çekilen yorumlar ve mevcut geliştirici yanıtı.
--   * reply_logs         Her AI taslağı ve yayınlanan metin.
--   * Sahiplik kuralları: her satırda user_id var; kullanıcı yalnız kendi satırlarını
--     görür. Bileşik yabancı anahtarlar, bir satırın başka kullanıcının uygulamasına
--     ya da anahtarına bağlanmasını veritabanı düzeyinde engeller.
--   * consume_rate_limit izin listesine play_sync ve play_connect eklenir.
--
-- Eski Google Haritalar tabloları (locations, reviews, ai_draft_logs) dokunulmadan kalır;
-- uygulama Faz 2–4'te yeni tablolara taşınınca ayrı bir migration ile kaldırılır.
--
-- Nasıl çalıştırılır: Supabase Dashboard → SQL Editor → New query → dosyanın tamamı →
-- Run. Tekrar çalıştırmak güvenlidir; hata olursa hiçbir değişiklik uygulanmaz.

begin;

-- ── Ortak: updated_at'i güncel tutan tetikleyici fonksiyonu ───────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ── 1.02 · store_credentials ───────────────────────────────────────
-- Anahtar uygulamada AES-256-GCM ile şifrelenir ("v1:<iv>:<tag>:<metin>").
-- İstemciler şifreli kolonu hiç okuyamaz; yazma yalnız sunucuda (service_role).

create table if not exists public.store_credentials (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    platform text not null default 'google_play'
        check (platform in ('google_play')),
    service_account_email text not null
        check (char_length(service_account_email) between 3 and 320
               and service_account_email like '%@%'),
    encrypted_key text not null
        check (encrypted_key like 'v1:%'),
    key_id text
        check (key_id is null or char_length(key_id) <= 100),
    last_verified_at timestamptz,
    last_error text
        check (last_error is null or char_length(last_error) <= 500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Bileşik yabancı anahtarlar için (apps.credential_id + user_id).
    constraint store_credentials_id_user_key unique (id, user_id),
    constraint store_credentials_user_account_key unique (user_id, platform, service_account_email)
);

-- ── 1.01 · apps ────────────────────────────────────────────────────

create table if not exists public.apps (
    id uuid primary key default public.uuid_generate_v7(),
    user_id uuid not null references auth.users (id) on delete cascade,
    credential_id uuid,
    platform text not null default 'google_play'
        check (platform in ('google_play')),
    package_name text not null
        check (char_length(package_name) <= 255
               and package_name ~ '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$'),
    display_name text not null
        check (char_length(btrim(display_name)) between 1 and 100),
    default_tone text not null default 'professional'
        check (default_tone in ('professional', 'friendly', 'apologetic', 'casual')),
    is_demo boolean not null default false,
    last_synced_at timestamptz,
    last_sync_error text
        check (last_sync_error is null or char_length(last_sync_error) <= 500),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint apps_id_user_key unique (id, user_id),
    constraint apps_user_package_key unique (user_id, platform, package_name),
    -- Uygulama yalnız aynı kullanıcının anahtarına bağlanabilir. Anahtar silinirse
    -- yalnız credential_id boşalır (user_id not null olduğu için ona dokunulmaz).
    constraint apps_credential_fkey foreign key (credential_id, user_id)
        references public.store_credentials (id, user_id)
        on delete set null (credential_id),
    -- Gerçek uygulamada credential_id zorunlu değil: anahtar silinince uygulama
    -- "bağlantı kopuk" durumda kalır. Demo uygulama ise hiçbir anahtara bağlanamaz.
    constraint apps_demo_has_no_credential check (not is_demo or credential_id is null)
);

-- ── 1.03 · app_reviews ─────────────────────────────────────────────
-- Alanlar Android Publisher API'nin Review nesnesini izler
-- (userComment ve developerComment).

create table if not exists public.app_reviews (
    id uuid primary key default public.uuid_generate_v7(),
    user_id uuid not null references auth.users (id) on delete cascade,
    app_id uuid not null,
    store_review_id text not null
        check (char_length(store_review_id) between 1 and 255),
    author_name text
        check (author_name is null or char_length(author_name) <= 200),
    star_rating smallint not null
        check (star_rating between 1 and 5),
    review_text text
        check (review_text is null or char_length(review_text) <= 10000),
    reviewer_language text
        check (reviewer_language is null or char_length(reviewer_language) <= 20),
    app_version_code integer,
    app_version_name text
        check (app_version_name is null or char_length(app_version_name) <= 100),
    device text
        check (device is null or char_length(device) <= 200),
    android_os_version integer,
    thumbs_up_count integer not null default 0 check (thumbs_up_count >= 0),
    review_updated_at timestamptz,
    developer_reply_text text
        check (developer_reply_text is null or char_length(developer_reply_text) <= 350),
    developer_reply_updated_at timestamptz,
    status text not null default 'pending'
        check (status in ('pending', 'replied')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint app_reviews_id_user_key unique (id, user_id),
    -- Aynı yorum, senkron tekrar çalışsa da tek satırdır (upsert anahtarı).
    constraint app_reviews_app_store_review_key unique (app_id, store_review_id),
    constraint app_reviews_app_fkey foreign key (app_id, user_id)
        references public.apps (id, user_id) on delete cascade
);

-- ── 1.04 · reply_logs ──────────────────────────────────────────────

create table if not exists public.reply_logs (
    id uuid primary key default public.uuid_generate_v7(),
    user_id uuid not null references auth.users (id) on delete cascade,
    review_id uuid not null,
    tone text not null
        check (tone in ('professional', 'friendly', 'apologetic', 'casual')),
    language text not null
        check (char_length(language) between 2 and 20),
    ai_draft text not null
        check (char_length(ai_draft) between 1 and 2000),
    published_text text
        check (published_text is null or char_length(published_text) between 1 and 350),
    is_edited boolean generated always as
        (published_text is not null and published_text is distinct from ai_draft) stored,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    constraint reply_logs_published_pair check ((published_text is null) = (published_at is null)),
    constraint reply_logs_review_fkey foreign key (review_id, user_id)
        references public.app_reviews (id, user_id) on delete cascade
);

-- ── İndeksler ──────────────────────────────────────────────────────

create index if not exists store_credentials_user_id_idx on public.store_credentials (user_id);
create index if not exists apps_credential_id_idx on public.apps (credential_id, user_id);
create index if not exists app_reviews_inbox_idx on public.app_reviews (app_id, status, review_updated_at desc);
create index if not exists app_reviews_user_id_idx on public.app_reviews (user_id);
create index if not exists reply_logs_review_id_idx on public.reply_logs (review_id, user_id);
create index if not exists reply_logs_user_id_idx on public.reply_logs (user_id);

-- ── updated_at tetikleyicileri ─────────────────────────────────────

drop trigger if exists store_credentials_set_updated_at on public.store_credentials;
create trigger store_credentials_set_updated_at
    before update on public.store_credentials
    for each row execute function public.set_updated_at();

drop trigger if exists apps_set_updated_at on public.apps;
create trigger apps_set_updated_at
    before update on public.apps
    for each row execute function public.set_updated_at();

drop trigger if exists app_reviews_set_updated_at on public.app_reviews;
create trigger app_reviews_set_updated_at
    before update on public.app_reviews
    for each row execute function public.set_updated_at();

-- ── 1.05 · Sahiplik kuralları (RLS) ────────────────────────────────

alter table public.store_credentials enable row level security;
alter table public.apps enable row level security;
alter table public.app_reviews enable row level security;
alter table public.reply_logs enable row level security;

do $$
declare
    p record;
begin
    for p in
        select tablename, policyname from pg_policies
         where schemaname = 'public'
           and tablename in ('store_credentials', 'apps', 'app_reviews', 'reply_logs')
    loop
        execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    end loop;
end
$$;

-- Anahtar: sahibi yalnız şifresiz kolonları okuyabilir (bkz. aşağıdaki kolon yetkisi).
create policy store_credentials_owner_select
    on public.store_credentials
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy apps_owner_all
    on public.apps
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy app_reviews_owner_all
    on public.app_reviews
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- Yanıt kaydı bir geçmiştir: eklenir ve okunur, sonradan değiştirilmez.
create policy reply_logs_owner_select
    on public.reply_logs
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy reply_logs_owner_insert
    on public.reply_logs
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

-- ── Tablo yetkileri ────────────────────────────────────────────────
-- Supabase yeni tabloları anon ve authenticated'a tam yetkiyle açar; önce hepsi
-- kapatılır, sonra yalnız gerekenler verilir.

revoke all on public.store_credentials, public.apps, public.app_reviews, public.reply_logs
    from anon, authenticated;

grant select (id, user_id, platform, service_account_email, key_id,
              last_verified_at, last_error, created_at, updated_at)
    on public.store_credentials to authenticated;
grant select, insert, update, delete on public.apps to authenticated;
grant select, insert, update, delete on public.app_reviews to authenticated;
grant select, insert on public.reply_logs to authenticated;

-- ── 1.06 · Hız sınırına yeni kovalar ───────────────────────────────
-- 01_rate_limit.sql'deki fonksiyonun aynısı; yalnız izin listesi genişledi.

create or replace function public.consume_rate_limit(
    p_bucket text,
    p_limit integer,
    p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user uuid := auth.uid();
    v_count integer;
begin
    if v_user is null then
        return false;
    end if;

    -- Yalnız uygulamanın kullandığı kovalar ve makul sınırlar kabul edilir;
    -- böylece fonksiyonu doğrudan çağıran biri tabloyu şişiremez.
    if p_bucket not in ('ai_draft', 'publish_reply', 'google_sync', 'demo_branch',
                        'play_sync', 'play_connect')
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
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

commit;

-- Kontrol:
-- select tablename, policyname, cmd from pg_policies
--  where tablename in ('store_credentials', 'apps', 'app_reviews', 'reply_logs');
--   → 5 satır
-- select has_column_privilege('authenticated', 'public.store_credentials', 'encrypted_key', 'select');
--   → false
