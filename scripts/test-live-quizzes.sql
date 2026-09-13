-- Execute through Supabase SQL/MCP. Everything is rolled back, including test users.
begin;
do $$
declare
  c uuid; other_c uuid; uid uuid := gen_random_uuid(); sid uuid; open_sid uuid;
  t1 uuid := gen_random_uuid(); t2 uuid := gen_random_uuid(); t3 uuid := gen_random_uuid();
  st jsonb; peer jsonb; q1 uuid; q2 uuid; pkg uuid; first_deadline text; rid uuid; denied boolean; qids uuid[];
begin
  insert into public.companies(name) values('QuizUp rollback test') returning id into c;
  insert into public.companies(name) values('QuizUp other tenant rollback test') returning id into other_c;
  insert into auth.users(id,email) values(uid,'live-test-'||uid||'@example.invalid');
  insert into public.profiles(id,company_id,role,first_name,last_name) values(uid,c,'admin','Test','Admin');
  perform set_config('request.jwt.claim.sub',uid::text,true);
  denied := false;
  begin perform public.create_live_quiz(other_c,'duel','{}','[{"text":"Test","answer":"Doğru"}]');
  exception when others then denied := true; end;
  if not denied then raise exception 'Cross-tenant creation allowed'; end if;
  insert into public.questions(company_id,question_text,type,options,correct_answer,is_active)
    values(c,'Bir haftada yedi gün vardır.','mcq','["Doğru","Yanlış"]','Doğru',true) returning id into q1;
  insert into public.questions(company_id,question_text,type,options,correct_answer,is_active)
    values(c,'İki artı iki beştir.','mcq','["Doğru","Yanlış"]','Yanlış',true) returning id into q2;
  insert into public.question_packages(company_id,name,question_ids,question_count,is_active)
    values(c,'Ortak test paketi',array[q1,q2],2,true) returning id into pkg;
  select question_ids into qids from public.question_packages where id=pkg;
  sid := public.create_live_quiz(c,'duel',qids);
  if (select question_ids from public.quiz_sessions where id=sid) <> qids or
    (select count(*) from public.questions where company_id=c) <> 2 then raise exception 'Duel did not reuse package/bank questions'; end if;
  denied := false;
  begin perform public.create_live_quiz(c,'duel','{}','[{"text":"No ad-hoc questions","answer":"Doğru"}]');
  exception when others then denied := true; end;
  if not denied then raise exception 'Duel accepted ad-hoc statements instead of question IDs'; end if;
  st := public.live_quiz(sid);
  if not (st->>'moderator')::boolean then raise exception 'Moderator missing'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  st := public.live_quiz(sid,'join',t1,'{"fullName":"Test Bir","store":"Test"}');
  st := public.live_quiz(sid,'join',t1,'{"fullName":"Test Bir","store":"Test"}');
  if (st->>'participantCount')::integer <> 1 then raise exception 'Duplicate participant'; end if;
  st := public.live_quiz(sid,'join',t2,'{"fullName":"Test İki","store":"Test"}');
  denied := false;
  begin perform public.live_quiz(sid,'join',t3,'{"fullName":"Test Üç","store":"Test"}');
  exception when others then denied := true; end;
  if not denied then raise exception 'Third duel participant allowed'; end if;
  denied := false;
  begin perform public.live_quiz(sid,'next',t1,'{"phase":"lobby","questionIndex":0}');
  exception when others then denied := true; end;
  if not denied then raise exception 'Guest moderator allowed'; end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  st := public.live_quiz(sid,'next',null,'{"phase":"lobby","questionIndex":0}');
  first_deadline := st->>'deadline';
  if abs(extract(epoch from ((st->>'deadline')::timestamptz-(st->>'serverNow')::timestamptz))-60) > 1 then raise exception 'Not 60 seconds'; end if;
  -- A retried moderator action must not skip a question or restart its clock.
  st := public.live_quiz(sid,'next',null,'{"phase":"lobby","questionIndex":0}');
  if st->>'deadline' <> first_deadline then raise exception 'Duplicate start reset timer'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  st := public.live_quiz(sid,'state',t1);
  if (st->'question') ? 'correctAnswer' then raise exception 'Answer key leaked'; end if;
  peer := public.live_quiz(sid,'state',t2);
  if st->'question' <> peer->'question' or st->>'deadline' <> peer->>'deadline' then raise exception 'Duel participants are not synchronized'; end if;
  st := public.live_quiz(sid,'answer',t1,'{"questionIndex":0,"answer":"Doğru"}');
  if st->>'phase' <> 'question' then raise exception 'Ended before all answers'; end if;
  st := public.live_quiz(sid,'answer',t1,'{"questionIndex":0,"answer":"Yanlış"}');
  if st->>'answer' <> 'Doğru' then raise exception 'Answer was changed'; end if;
  st := public.live_quiz(sid,'answer',t2,'{"questionIndex":0,"answer":"Yanlış"}');
  if st->>'phase' <> 'reveal' or st->'question'->>'correctAnswer' <> 'Doğru' then raise exception 'Early reveal failed'; end if;
  update public.live_quiz_rooms set deadline=clock_timestamp()-interval '10 seconds' where session_id=sid;
  st := public.live_quiz(sid,'state',t1);
  if st->>'phase' <> 'reveal' then raise exception 'Duel advanced without moderator'; end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  st := public.live_quiz(sid,'next',null,'{"phase":"reveal","questionIndex":0}');
  perform set_config('request.jwt.claim.sub','',true);
  st := public.live_quiz(sid,'answer',t1,'{"questionIndex":0,"answer":"Doğru"}');
  if st->>'answer' is not null then raise exception 'Stale answer applied'; end if;
  update public.live_quiz_rooms set deadline=clock_timestamp()-interval '1 second' where session_id=sid;
  st := public.live_quiz(sid,'answer',t2,'{"questionIndex":1,"answer":"Yanlış"}');
  if st->>'answer' is not null or st->>'phase' <> 'reveal' then raise exception 'Late answer accepted'; end if;
  perform set_config('request.jwt.claim.sub',uid::text,true);
  st := public.live_quiz(sid,'next',null,'{"phase":"reveal","questionIndex":1}');
  perform set_config('request.jwt.claim.sub','',true);
  st := public.live_quiz(sid,'state',t1); rid := (st->>'resultId')::uuid;
  st := public.live_quiz(sid,'state',t1);
  if st->>'phase' <> 'finished' or rid is null or rid <> (st->>'resultId')::uuid or
    (select count(*) from public.results where session_id=sid) <> 2 then raise exception 'Result duplication/missing result'; end if;
  if (select (score->>'correct')::integer from public.results where id=rid) <> 1 then raise exception 'Wrong score'; end if;

  select question_ids into qids from public.quiz_sessions where id=sid;
  update public.questions set is_active=true where id=any(qids);
  perform set_config('request.jwt.claim.sub',uid::text,true);
  open_sid := public.create_live_quiz(c,'open',qids);
  perform set_config('request.jwt.claim.sub','',true);
  st := public.live_quiz(open_sid,'join',t1,'{"fullName":"Test Bir","store":"Test"}'); first_deadline:=st->>'deadline';
  st := public.live_quiz(open_sid,'join',t2,'{"fullName":"Test İki","store":"Test"}');
  if st->>'deadline' <> first_deadline then raise exception 'Second join reset lobby'; end if;
  update public.live_quiz_rooms set deadline=clock_timestamp()-interval '1 second' where session_id=open_sid;
  st := public.live_quiz(open_sid,'state',t1);
  peer := public.live_quiz(open_sid,'state',t2);
  if st->'question' <> peer->'question' or st->>'deadline' <> peer->>'deadline' then raise exception 'Open participants are not synchronized'; end if;
  denied := false;
  begin perform public.live_quiz(open_sid,'join',t3,'{"fullName":"Test Üç","store":"Test"}');
  exception when others then denied := true; end;
  if not denied then raise exception 'Late join allowed'; end if;
  st := public.live_quiz(open_sid,'answer',t1,'{"questionIndex":0,"answer":"Doğru"}');
  st := public.live_quiz(open_sid,'leave',t2);
  if st->>'phase' <> 'reveal' then raise exception 'Departed player still blocks early reveal'; end if;
  update public.live_quiz_rooms set deadline=clock_timestamp()-interval '1 second' where session_id=open_sid;
  st := public.live_quiz(open_sid,'state',t1);
  if st->>'questionIndex' <> '1' or st->>'phase' <> 'question' then raise exception 'Shared automatic advance failed'; end if;
  -- A long background suspension catches up through expiry, reveal, and finish.
  update public.live_quiz_rooms set deadline=clock_timestamp()-interval '70 seconds' where session_id=open_sid;
  st := public.live_quiz(open_sid,'state',t1);
  if st->>'phase' <> 'finished' then raise exception 'Background catch-up failed'; end if;
  if has_table_privilege('anon','public.live_quiz_players','SELECT') or
    has_table_privilege('authenticated','public.live_quiz_rooms','UPDATE') then raise exception 'Private table access allowed'; end if;
end;
$$;
rollback;
select 'PASS: tenant access, moderator auth, capacity, idempotency, deadlines, early reveal, expiry, leave, reconnect, scoring, private tables; all fixtures rolled back' as result;
