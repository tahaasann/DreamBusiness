-- Proficios · 02 · Abonelik tablolarını istemciye kapat (rapor maddesi 3 / K2)
--
-- Ne yapar:
--   * subscriptions ve webhook_events tabloları yoksa oluşturur, eksik kolonları ekler.
--   * subscriptions: kullanıcı yalnız KENDİ satırını okuyabilir; hiçbir istemci yazamaz.
--   * webhook_events: istemciye tamamen kapalı.
--   * Bu iki tablodaki mevcut tüm RLS politikalarını silip yerine yalnız yukarıdakini koyar.
--   Yazma işini yalnız Paddle webhook'u, SUPABASE_SECRET_KEY ile (RLS'i aşarak) yapar.
--
-- Nasıl çalıştırılır: Supabase Dashboard → SQL Editor → New query → bu dosyanın
-- tamamını yapıştır → Run. Tekrar çalıştırmak güvenlidir.

-- 1) Tablolar ve kolonlar --------------------------------------------------------

begin;

create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    plan text not null default 'free',
    status text not null default 'inactive',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.subscriptions
    add column if not exists paddle_customer_id text,
    add column if not exists paddle_subscription_id text,
    add column if not exists paddle_price_id text,
    add column if not exists billing_cycle text,
    add column if not exists current_period_start timestamptz,
    add column if not exists current_period_end timestamptz,
    add column if not exists cancel_at timestamptz,
    add column if not exists canceled_at timestamptz;

-- Webhook upsert'i onConflict: 'user_id' kullanır; bunun için benzersiz indeks şart.
create unique index if not exists subscriptions_user_id_key on public.subscriptions (user_id);
create index if not exists subscriptions_paddle_subscription_id_idx on public.subscriptions (paddle_subscription_id);

create table if not exists public.webhook_events (
    id uuid primary key default gen_random_uuid(),
    paddle_event_id text not null,
    event_type text not null,
    created_at timestamptz not null default now()
);

alter table public.webhook_events
    add column if not exists payload jsonb,
    add column if not exists status text not null default 'processed',
    add column if not exists processed_at timestamptz;

create unique index if not exists webhook_events_paddle_event_id_key on public.webhook_events (paddle_event_id);

-- 2) RLS: önce iki tablodaki tüm eski politikaları kaldır ------------------------

alter table public.subscriptions enable row level security;
alter table public.webhook_events enable row level security;

do $$
declare
    p record;
begin
    for p in
        select tablename, policyname
          from pg_policies
         where schemaname = 'public'
           and tablename in ('subscriptions', 'webhook_events')
    loop
        execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    end loop;
end
$$;

-- 3) Yeni kurallar ---------------------------------------------------------------

-- Kullanıcı yalnız kendi aboneliğini okuyabilir (dashboard'daki Pro rozeti için).
create policy subscriptions_select_own
    on public.subscriptions
    for select
    to authenticated
    using ((select auth.uid())::text = user_id::text);

-- Tablo yetkileri: istemci rolleri yazamaz; anon hiç okuyamaz.
revoke insert, update, delete, truncate on public.subscriptions from anon, authenticated;
revoke select on public.subscriptions from anon;
revoke all on public.webhook_events from anon, authenticated;

-- 4) Kontrol ---------------------------------------------------------------------
-- Aşağıdaki sorgu yalnız "subscriptions_select_own" satırını döndürmeli:
-- select tablename, policyname, cmd from pg_policies
--  where schemaname = 'public' and tablename in ('subscriptions', 'webhook_events');

commit;
