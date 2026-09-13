-- Enforce the two-button duel rule for every newly created 1 vs 1 session.
-- Both live modes use the same selected question IDs as individual quizzes.
-- Retain the old argument for RPC compatibility, but never create ad-hoc questions.
create or replace function public.create_live_quiz(p_company_id uuid, p_mode text, p_question_ids uuid[] default '{}', p_statements jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  sid uuid; profile public.profiles;
begin
  select * into profile from public.profiles where id = auth.uid();
  if p_company_id is null or profile.id is null or not (coalesce(profile.is_super_admin,false) or
    (profile.company_id = p_company_id and profile.role in ('admin','manager'))) or coalesce(profile.sessions_disabled,false) then
    raise exception 'Oturum oluşturma yetkiniz yok';
  end if;
  if p_mode is null or p_mode not in ('open','duel') then raise exception 'Geçersiz mod'; end if;
  if coalesce(cardinality(p_question_ids),0) not between 1 and 100 or
    (select count(distinct id) from public.questions where id = any(p_question_ids) and company_id = p_company_id and is_active) <> cardinality(p_question_ids) then
    raise exception 'Şirketinize ait 1–100 aktif soru seçin';
  end if;
  if p_mode = 'duel' and exists(
    select 1 from public.questions q
    where q.id = any(p_question_ids) and (
      q.type <> 'mcq' or jsonb_array_length(q.options) <> 2
      or not (q.options ? 'Doğru' and q.options ? 'Yanlış')
      or q.correct_answer not in ('Doğru','Yanlış')
    )
  ) then
    raise exception '1’e 1 düelloda yalnızca Doğru / Yanlış soruları seçilebilir';
  end if;
  insert into public.quiz_sessions(company_id,employee,created_by,question_ids,status,session_mode,timer_mode)
  values(p_company_id,'{}',auth.uid()::text,p_question_ids,'active',p_mode,'per_question') returning id into sid;
  return sid;
end;
$$;
revoke all on function public.create_live_quiz(uuid,text,uuid[],jsonb) from public;
grant execute on function public.create_live_quiz(uuid,text,uuid[],jsonb) to authenticated;
