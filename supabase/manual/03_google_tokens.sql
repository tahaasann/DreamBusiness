-- Proficios · 03 · Google bağlantı token'ları (rapor maddesi 5 / Y1, Y2)
--
-- Ne yapar: Google ile girişte alınan yenileme token'ını (refresh token) şifreli
-- olarak saklayacak tabloyu oluşturur. Şifreleme uygulamada AES-256-GCM ile yapılır
-- (src/lib/crypto/token-cipher.ts); bu tabloda düz metin token bulunmaz.
-- Tablo istemcilere tamamen kapalıdır; yalnız sunucu SUPABASE_SECRET_KEY ile erişir.
--
-- Nasıl çalıştırılır: Supabase Dashboard → SQL Editor → New query → bu dosyanın
-- tamamını yapıştır → Run. Tekrar çalıştırmak güvenlidir.

begin;

create table if not exists public.google_oauth_tokens (
    user_id uuid primary key references auth.users (id) on delete cascade,
    refresh_token_ciphertext text not null,
    access_token_ciphertext text,
    access_token_expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.google_oauth_tokens enable row level security;

-- Bu tabloda hiçbir politika olmamalı: istemciler okuyamaz ve yazamaz.
do $$
declare
    p record;
begin
    for p in
        select policyname from pg_policies
         where schemaname = 'public' and tablename = 'google_oauth_tokens'
    loop
        execute format('drop policy %I on public.google_oauth_tokens', p.policyname);
    end loop;
end
$$;

revoke all on public.google_oauth_tokens from anon, authenticated;

commit;

-- Kontrol (Google ile yeniden giriş yaptıktan sonra 1 satır görmelisin; token'lar şifreli):
-- select user_id, access_token_expires_at, updated_at from public.google_oauth_tokens;
