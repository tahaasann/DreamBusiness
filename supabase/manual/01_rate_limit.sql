-- Proficios · 01 · Kullanıcı başına hız sınırı (rapor maddesi 2 / K3)
--
-- Ne yapar: Server action'ların her kullanıcı için kaç kez çalışabileceğini
-- Postgres içinde sayar. Kod tarafı src/lib/rate-limit.ts dosyasındadır.
--
-- Nasıl çalıştırılır: Supabase Dashboard → SQL Editor → New query → bu dosyanın
-- tamamını yapıştır → Run. Tekrar çalıştırmak güvenlidir.

begin;

create table if not exists public.rate_limit_events (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    bucket text not null,
    created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
    on public.rate_limit_events (user_id, bucket, created_at desc);

-- Bilerek hiç politika tanımlanmıyor: istemciler tabloyu okuyamaz ve yazamaz.
-- Tabloya yalnız aşağıdaki security definer fonksiyon erişir.
alter table public.rate_limit_events enable row level security;

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
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

commit;

-- Kontrol: aşağıdaki sorgu 1 satır döndürmeli.
-- select proname from pg_proc where proname = 'consume_rate_limit';
