\set ON_ERROR_STOP on
set client_min_messages = notice;

-- Fixture (as table owner / service role equivalent)
insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.store_credentials (id, user_id, service_account_email, encrypted_key) values
  ('c0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'bot@a.iam.gserviceaccount.com', 'v1:x:y:z'),
  ('c0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'bot@b.iam.gserviceaccount.com', 'v1:x:y:z');
insert into public.apps (id, user_id, credential_id, package_name, display_name) values
  ('a0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000a', 'com.fernly.app', 'Fernly'),
  ('a0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000b', 'com.other.app', 'Other');
insert into public.app_reviews (id, user_id, app_id, store_review_id, star_rating, review_text) values
  ('e0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000b', 'gp:B1', 2, 'meh');

select t.expect_error($$insert into public.apps (user_id, package_name, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'not a package', 'X')$$, '23514', 'package name format is checked');
select t.expect_error($$insert into public.apps (user_id, package_name, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'com.fernly.app', 'Dup')$$, '23505', 'package name unique per user');
with w as (insert into public.apps (user_id, package_name, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'com.fernly.app', 'Same pkg other user') returning 1) select t.ok((select count(*) = 1 from w), 'same package allowed for another user');
select t.expect_error($$insert into public.apps (user_id, credential_id, package_name, display_name, is_demo) values ('aaaaaaaa-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000a', 'com.demo.app', 'Demo', true)$$, '23514', 'demo app cannot hold a credential');
select t.expect_error($$insert into public.store_credentials (user_id, service_account_email, encrypted_key) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x@y.z', 'plaintext-json')$$, '23514', 'credential must be ciphertext');

-- ── As user A ───────────────────────────────────────────────────────
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

select t.ok((select count(*) = 1 from public.apps), 'A sees only own apps');
select t.ok((select count(*) = 0 from public.app_reviews), 'A cannot see B reviews');
select t.ok((select count(*) = 1 from (select id, service_account_email, last_verified_at from public.store_credentials) x), 'A reads own credential metadata');
select t.expect_error($$select encrypted_key from public.store_credentials$$, '42501', 'A cannot read encrypted_key');
select t.expect_error($$select * from public.store_credentials$$, '42501', 'select * on credentials is refused');
select t.expect_error($$insert into public.store_credentials (user_id, service_account_email, encrypted_key) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a@b.c', 'v1:a')$$, '42501', 'A cannot write credentials');
select t.expect_error($$insert into public.apps (user_id, package_name, display_name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'com.evil.app', 'Evil')$$, '42501', 'A cannot create app for B (RLS)');
select t.expect_error($$insert into public.apps (user_id, credential_id, package_name, display_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000b', 'com.steal.app', 'Steal')$$, '23503', 'A cannot attach B credential');
select t.expect_error($$insert into public.app_reviews (user_id, app_id, store_review_id, star_rating) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000b', 'gp:X', 5)$$, '23503', 'A cannot add review to B app');
with w as (update public.apps set display_name = 'hacked' where id = 'a0000000-0000-0000-0000-00000000000b' returning 1) select t.ok((select count(*) = 0 from w), 'A cannot update B app');
with w as (delete from public.app_reviews where id = 'e0000000-0000-0000-0000-00000000000b' returning 1) select t.ok((select count(*) = 0 from w), 'A cannot delete B review');

insert into public.app_reviews (id, user_id, app_id, store_review_id, star_rating, review_text, reviewer_language)
values ('e0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'gp:A1', 1, 'Crashes on launch', 'en');
select t.ok(true, 'A adds review to own app');
select t.expect_error($$insert into public.app_reviews (user_id, app_id, store_review_id, star_rating) values ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'gp:A1', 3)$$, '23505', 'store review id unique per app');

insert into public.reply_logs (user_id, review_id, tone, language, ai_draft, published_text, published_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-00000000000a', 'apologetic', 'en', 'Sorry!', 'Sorry! Fixed in 2.1.', now());
select t.ok((select is_edited from public.reply_logs limit 1), 'is_edited computed when text differs');
select t.expect_error($$update public.reply_logs set published_text = 'x'$$, '42501', 'reply logs are append-only');
select t.expect_error($$insert into public.reply_logs (user_id, review_id, tone, language, ai_draft, published_text, published_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-00000000000a', 'casual', 'en', 'd', repeat('x', 351), now())$$, '23514', 'published reply max 350 chars');
select t.expect_error($$insert into public.reply_logs (user_id, review_id, tone, language, ai_draft) values ('aaaaaaaa-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-00000000000b', 'casual', 'en', 'd')$$, '23503', 'A cannot log reply on B review');

select t.ok(public.consume_rate_limit('play_sync', 6, 600), 'play_sync bucket allowed');
select t.ok(public.consume_rate_limit('play_connect', 10, 3600), 'play_connect bucket allowed');
select t.expect_error($$select public.consume_rate_limit('nope', 1, 60)$$, 'P0001', 'unknown bucket rejected');
select t.expect_error($$truncate public.apps$$, '42501', 'A cannot truncate');
commit;

-- ── Anonymous visitor ──────────────────────────────────────────────
begin;
set local role anon;
select t.expect_error($$select id from public.apps$$, '42501', 'anon cannot read apps');
select t.expect_error($$select id from public.app_reviews$$, '42501', 'anon cannot read reviews');
select t.expect_error($$select id from public.reply_logs$$, '42501', 'anon cannot read reply logs');
select t.expect_error($$select id from public.store_credentials$$, '42501', 'anon cannot read credentials');
commit;

-- ── Cascades and triggers ──────────────────────────────────────────
select pg_sleep(0.01);
update public.apps set display_name = 'Fernly 2' where id = 'a0000000-0000-0000-0000-00000000000a';
select t.ok((select updated_at > created_at from public.apps where id = 'a0000000-0000-0000-0000-00000000000a'), 'updated_at trigger fires');
delete from public.store_credentials where id = 'c0000000-0000-0000-0000-00000000000a';
select t.ok((select credential_id is null and user_id = 'aaaaaaaa-0000-0000-0000-000000000001' from public.apps where id = 'a0000000-0000-0000-0000-00000000000a'), 'deleting credential detaches app, keeps owner');
delete from public.apps where id = 'a0000000-0000-0000-0000-00000000000a';
select t.ok((select count(*) = 0 from public.app_reviews where app_id = 'a0000000-0000-0000-0000-00000000000a') and (select count(*) = 0 from public.reply_logs where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'deleting app removes its reviews and logs');
delete from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select t.ok((select count(*) = 0 from public.apps where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 'deleting user removes everything');
select t.ok((select count(*) = 5 from pg_policies where tablename in ('store_credentials','apps','app_reviews','reply_logs')), 'five policies');
\echo ALL TESTS PASSED
