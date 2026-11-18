-- Proficios · 2026-11-18 · Yetki sıkılaştırma
--
-- Canlıya UYGULANACAK. Supabase Dashboard → SQL Editor → New query → bu dosyanın
-- tamamını yapıştır → Run. Tekrar çalıştırmak güvenlidir; hata olursa hiçbir
-- değişiklik uygulanmaz.
--
-- Ne yapar:
--   (03 / google_oauth_tokens burada YOK: görev 0.09 ile Google Play pivotu
--    nedeniyle ertelendi.)
--   1. rate_limit_events: istemcilerin tablo yetkilerini kaldırır. Tabloya yalnız
--      consume_rate_limit (security definer) erişir; RLS yine de satırları
--      koruyordu ama TRUNCATE RLS'e takılmaz.
--   2. Kullanıcı tablolarında authenticated'ın TRUNCATE/REFERENCES/TRIGGER
--      yetkilerini kaldırır. Uygulama yalnız select/insert/update/delete kullanır.
--   3. uuid_generate_v7: search_path sabitlenir (Supabase güvenlik uyarısı).
--   4. subscriptions ve webhook_events üzerindeki tekrar eden indeksleri siler.
--      Benzersizlik kısıtları (upsert'lerin kullandığı) yerinde kalır.

begin;

-- 1 ── Hız sınırı tablosu istemcilere kapalı ─────────────────────────

revoke all on public.rate_limit_events from anon, authenticated;

-- 2 ── Gereksiz tablo yetkileri ─────────────────────────────────────

revoke truncate, references, trigger
    on public.locations, public.reviews, public.ai_draft_logs
  from anon, authenticated;

revoke references, trigger
    on public.platform_metrics, public.subscriptions
  from anon, authenticated;

-- 3 ── Sabit search_path (gen_random_bytes, extensions şemasında) ────

alter function public.uuid_generate_v7() set search_path = pg_catalog, extensions;

-- 4 ── Tekrar eden indeksler ────────────────────────────────────────
-- subscriptions.user_id        → subscriptions_user_id_unique kısıtı kalır
-- subscriptions.paddle_sub_id  → subscriptions_paddle_subscription_id_key kısıtı kalır
-- webhook_events.paddle_event_id → webhook_events_paddle_event_id_key kısıtı kalır

drop index if exists public.subscriptions_user_id_key;
drop index if exists public.idx_subscriptions_user_id;
drop index if exists public.idx_subscriptions_paddle_sub_id;
drop index if exists public.subscriptions_paddle_subscription_id_idx;
drop index if exists public.idx_webhook_events_paddle_event_id;

commit;

-- Kontrol:
-- select has_table_privilege('anon', 'public.rate_limit_events', 'select');   → false
-- select indexname from pg_indexes where tablename = 'subscriptions';         → pkey, status, iki *_key/_unique
