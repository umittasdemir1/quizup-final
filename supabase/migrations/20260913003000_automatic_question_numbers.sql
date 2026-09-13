-- Question numbers are zero-based internally and displayed as 1..N.
-- Keep each tenant's full pool (including inactive questions) in creation order.
-- Question IDs, quiz/package references and RLS policies are unchanged.
lock table public.questions in share row exclusive mode;

with numbered as (
  select id, (row_number() over (
    partition by company_id order by created_at asc nulls last, id asc
  ) - 1)::integer as question_order
  from public.questions
)
update public.questions q
set sort_order = n.question_order
from numbered n
where q.id = n.id and q.sort_order is distinct from n.question_order;

alter table public.questions alter column sort_order set not null;
create unique index questions_company_sort_order_key
  on public.questions (company_id, sort_order);

-- Allocate on the server, including imports and accepted question suggestions.
-- Serialize allocation per company to avoid duplicate numbers across clients.
create function public.assign_question_number()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    new.sort_order := old.sort_order;
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('public.questions.numbering:' || new.company_id::text, 0));
  select coalesce(max(sort_order), -1) + 1 into new.sort_order
  from public.questions where company_id = new.company_id;
  return new;
end;
$$;
revoke all on function public.assign_question_number() from public, anon, authenticated;

create trigger questions_assign_number
before insert or update of sort_order on public.questions
for each row execute function public.assign_question_number();
