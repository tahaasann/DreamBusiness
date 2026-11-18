-- Minimal Supabase-like environment: roles, auth schema, default grants.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema extensions;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth, extensions, public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase opens every new public object to the API roles by default.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Test helper: run a statement as the current role and require a given SQLSTATE.
create schema t;
grant usage on schema t to public;
create function t.expect_error(p_sql text, p_state text, p_label text) returns void
language plpgsql as $$
begin
    begin
        execute p_sql;
    exception when others then
        if sqlstate = p_state then
            raise notice 'PASS  %', p_label;
            return;
        end if;
        raise exception 'FAIL  % : expected %, got % (%)', p_label, p_state, sqlstate, sqlerrm;
    end;
    raise exception 'FAIL  % : expected error %, statement succeeded', p_label, p_state;
end $$;
create function t.ok(p_cond boolean, p_label text) returns void
language plpgsql as $$
begin
    if p_cond is distinct from true then
        raise exception 'FAIL  %', p_label;
    end if;
    raise notice 'PASS  %', p_label;
end $$;
grant execute on all functions in schema t to public;
