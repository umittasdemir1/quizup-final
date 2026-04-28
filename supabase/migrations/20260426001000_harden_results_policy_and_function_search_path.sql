-- Harden RLS helpers and prevent unrestricted result inserts.

alter function public.update_updated_at() set search_path = public, auth;
alter function public.get_my_company_id() set search_path = public, auth;
alter function public.is_super_admin() set search_path = public, auth;
alter function public.get_my_role() set search_path = public, auth;
alter function public.update_active_session(uuid, text, jsonb) set search_path = public, auth;
alter function public.remove_active_session(uuid, text) set search_path = public, auth;

drop policy if exists "Herkes sonuç ekleyebilir (quiz submit)" on public.results;

create policy "Aktif oturuma sonuç eklenir"
on public.results
for insert
with check (
  is_super_admin()
  or (
    get_my_role() = 'admin'
    and company_id = get_my_company_id()
  )
  or exists (
    select 1
    from public.quiz_sessions s
    where s.id = results.session_id
      and s.company_id = results.company_id
      and s.status = 'active'
  )
);
