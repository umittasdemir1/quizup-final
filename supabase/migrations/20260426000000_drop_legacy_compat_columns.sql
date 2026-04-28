-- Remove Firebase-era compatibility columns after the app has switched to Supabase UUIDs.
-- The data backfill blocks are intentionally guarded so this migration is safe to rerun
-- in environments where some legacy columns were already removed.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quiz_sessions' and column_name = 'question_firebase_ids'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'questions' and column_name = 'firebase_id'
  ) then
    with mapped as (
      select
        qs.id as session_id,
        array_agg(q.id order by ids.ordinality) as question_ids
      from public.quiz_sessions qs
      join unnest(qs.question_firebase_ids) with ordinality as ids(legacy_id, ordinality) on true
      join public.questions q on q.firebase_id = ids.legacy_id
      where coalesce(cardinality(qs.question_ids), 0) = 0
        and cardinality(qs.question_firebase_ids) > 0
      group by qs.id
    )
    update public.quiz_sessions qs
    set question_ids = mapped.question_ids
    from mapped
    where qs.id = mapped.session_id
      and cardinality(mapped.question_ids) > 0;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'question_packages' and column_name = 'question_firebase_ids'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'questions' and column_name = 'firebase_id'
  ) then
    with mapped as (
      select
        qp.id as package_id,
        array_agg(q.id order by ids.ordinality) as question_ids
      from public.question_packages qp
      join unnest(qp.question_firebase_ids) with ordinality as ids(legacy_id, ordinality) on true
      join public.questions q on q.firebase_id = ids.legacy_id
      where coalesce(cardinality(qp.question_ids), 0) = 0
        and cardinality(qp.question_firebase_ids) > 0
      group by qp.id
    )
    update public.question_packages qp
    set question_ids = mapped.question_ids,
        question_count = cardinality(mapped.question_ids)
    from mapped
    where qp.id = mapped.package_id
      and cardinality(mapped.question_ids) > 0;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'results' and column_name = 'session_firebase_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quiz_sessions' and column_name = 'firebase_id'
  ) then
    update public.results r
    set session_id = qs.id
    from public.quiz_sessions qs
    where r.session_id is null
      and r.session_firebase_id is not null
      and qs.firebase_id = r.session_firebase_id;
  end if;
end $$;

alter table if exists public.profiles drop column if exists firebase_uid;

alter table if exists public.companies drop column if exists firebase_id;
alter table if exists public.questions drop column if exists firebase_id;
alter table if exists public.quiz_sessions drop column if exists firebase_id;
alter table if exists public.quiz_sessions drop column if exists question_firebase_ids;
alter table if exists public.results drop column if exists firebase_id;
alter table if exists public.results drop column if exists session_firebase_id;
alter table if exists public.question_packages drop column if exists firebase_id;
alter table if exists public.question_packages drop column if exists question_firebase_ids;
alter table if exists public.suggested_questions drop column if exists firebase_id;
