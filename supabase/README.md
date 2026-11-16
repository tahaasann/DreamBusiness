# Supabase

Bu klasör Proficios'un veritabanı şemasını ve güvenlik kurallarını (RLS) repoda tutar.

## `manual/` — bir kez elle çalıştırılan betikler

Supabase Dashboard → **SQL Editor** → **New query** → dosyanın tamamını yapıştır → **Run**.
Hepsi tekrar çalıştırılabilir; hata verirse o betikteki hiçbir değişiklik uygulanmaz.

| Sıra | Dosya | Ne yapar | Kod tarafı |
|---|---|---|---|
| 1 | `01_rate_limit.sql` | Kullanıcı başına hız sınırı (`consume_rate_limit`) | `src/lib/rate-limit.ts` |
| 2 | `02_billing_lockdown.sql` | `subscriptions` ve `webhook_events`: istemci yazamaz | `src/app/api/webhooks/paddle/route.ts` |
| 3 | `03_google_tokens.sql` | Şifreli Google yenileme token'ları | `src/lib/google/tokens.ts` |
| 4 | `04_platform_metrics.sql` | Herkese açık sayaçlar; yalnız sunucu artırabilir | `src/lib/metrics-tracker.ts` |
| 5 | `05_owner_rls.sql` | `locations`, `reviews`, `ai_draft_logs`: yalnız sahibi | tüm server action'lar |
| 6 | `06_export_schema.sql` | **Salt okunur.** Şemanın tamamını tek SQL metni olarak üretir | — |

Betikler 02–05, sunucunun `SUPABASE_SECRET_KEY` ile çalışmasını varsayar
(bkz. `../.env.example`).

## `migrations/` — bundan sonraki değişiklikler

`06_export_schema.sql` çıktısı `migrations/` altına başlangıç (baseline) migration'ı
olarak kaydedilir. Ondan sonraki her şema değişikliği yeni, tarihli bir migration
dosyasıyla yapılır; Dashboard'dan elle tablo değiştirilmez. Böylece yeni bir ortam
(staging, yerel) aynı şemayla kurulabilir ve RLS kuralları kod incelemesinden geçer.
