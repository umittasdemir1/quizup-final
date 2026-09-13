create or replace function public.create_live_quiz(p_company_id uuid, p_mode text, p_question_ids uuid[] default '{}', p_statements jsonb default '[]')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  sid uuid; qid uuid; ids uuid[] := '{}'; item jsonb; profile public.profiles;
begin
  select * into profile from public.profiles where id = auth.uid();
  if p_company_id is null or profile.id is null or not (coalesce(profile.is_super_admin,false) or
    (profile.company_id = p_company_id and profile.role in ('admin','manager'))) or coalesce(profile.sessions_disabled,false) then
    raise exception 'Oturum oluşturma yetkiniz yok';
  end if;
  if p_mode is null or p_mode not in ('open','duel') then raise exception 'Geçersiz mod'; end if;
  if p_mode = 'duel' then
    if jsonb_typeof(p_statements) <> 'array' or jsonb_array_length(p_statements) not between 1 and 100 then
      raise exception '1–100 doğru/yanlış sorusu ekleyin';
    end if;
    for item in select value from jsonb_array_elements(p_statements) loop
      if length(trim(coalesce(item->>'text',''))) not between 1 and 2000 or
        coalesce(item->>'answer','') not in ('Doğru','Yanlış') then raise exception 'Soru ve cevap anahtarı gerekli'; end if;
      insert into public.questions(company_id,question_text,type,options,correct_answer,is_active,has_timer,timer_seconds,difficulty,created_by)
      values(p_company_id,trim(item->>'text'),'mcq','["Doğru","Yanlış"]',item->>'answer',false,true,60,'medium',auth.uid()::text)
      returning id into qid;
      ids := array_append(ids,qid);
    end loop;
  else
    if coalesce(cardinality(p_question_ids),0) not between 1 and 100 or
      (select count(distinct id) from public.questions where id = any(p_question_ids) and company_id = p_company_id and is_active) <> cardinality(p_question_ids) then
      raise exception 'Şirketinize ait 1–100 aktif soru seçin';
    end if;
    ids := p_question_ids;
  end if;
  insert into public.quiz_sessions(company_id,employee,created_by,question_ids,status,session_mode,timer_mode)
  values(p_company_id,'{}',auth.uid()::text,ids,'active',p_mode,'per_question') returning id into sid;
  return sid;
end;
$$;
revoke all on function public.create_live_quiz(uuid,text,uuid[],jsonb) from public;
grant execute on function public.create_live_quiz(uuid,text,uuid[],jsonb) to authenticated;

create or replace function public.live_quiz(p_session_id uuid, p_action text default 'state', p_token uuid default null, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  s public.quiz_sessions; r public.live_quiz_rooms; player public.live_quiz_players; person public.live_quiz_players;
  moderator boolean; n timestamptz := clock_timestamp(); q jsonb; snapshot jsonb; a jsonb; item jsonb;
  answer_value text; correct_count integer; xp integer; base integer; used numeric; total_used numeric;
  mapped_answers jsonb; times jsonb; breakdown jsonb; result_uuid uuid; total integer; active_count integer;
  answered_count integer; players_json jsonb; question_json jsonb; i integer; is_correct boolean;
begin
  -- Every action locks the same row, including simultaneous joins and final answers.
  select * into s from public.quiz_sessions where id = p_session_id for update;
  n := clock_timestamp(); -- Lock wait time must count toward the deadline.
  if s.id is null or s.session_mode not in ('open','duel') then raise exception 'Canlı oturum bulunamadı'; end if;
  if s.status = 'cancelled' then raise exception 'Oturum iptal edildi'; end if;
  moderator := exists(select 1 from public.profiles p where p.id = auth.uid() and
    (p.is_super_admin or (p.company_id = s.company_id and p.role in ('admin','manager') and
      (p.role = 'admin' or s.created_by = p.id::text))));
  if p_action not in ('state','join','answer','next','leave') then raise exception 'Geçersiz işlem'; end if;
  if p_action = 'next' and not moderator then raise exception 'Moderatör yetkisi gerekli'; end if;
  select * into r from public.live_quiz_rooms where session_id = s.id;
  if r.session_id is null then
    if s.status <> 'active' then raise exception 'Oturum tamamlandı'; end if;
    select jsonb_agg(jsonb_build_object('id',q.id,'text',q.question_text,'type',q.type,'options',q.options,
      'correctAnswer',q.correct_answer,'difficulty',q.difficulty,'category',q.category,
      'image',q.question_image_url,'optionImages',q.option_image_urls) order by selected.ord)
    into snapshot from unnest(s.question_ids) with ordinality selected(id,ord)
    join public.questions q on q.id=selected.id and q.company_id=s.company_id;
    if snapshot is null or jsonb_array_length(snapshot) <> cardinality(s.question_ids) then raise exception 'Oturum soruları eksik'; end if;
    insert into public.live_quiz_rooms(session_id,questions) values(s.id,snapshot) returning * into r;
  end if;
  total := jsonb_array_length(r.questions);
  if p_token is not null then
    select * into player from public.live_quiz_players where session_id=s.id and token_hash=md5(p_token::text);
  end if;

  -- Catch up from absolute deadlines, even after a suspended browser reconnects.
  loop
    if r.deadline is null or n < r.deadline then exit; end if;
    if r.phase = 'lobby' and s.session_mode = 'open' then
      r.phase := 'question'; r.started_at := r.deadline; r.deadline := r.deadline + interval '60 seconds';
    elsif r.phase = 'question' then
      r.phase := 'reveal'; r.deadline := r.deadline + interval '4 seconds';
    elsif r.phase = 'reveal' and s.session_mode = 'open' then
      if r.question_index + 1 >= total then r.phase := 'finished'; r.deadline := null;
      else r.question_index := r.question_index + 1; r.phase := 'question'; r.started_at := r.deadline; r.deadline := r.deadline + interval '60 seconds'; end if;
    else exit;
    end if;
  end loop;

  if p_action = 'join' and player.id is null then
    if p_token is null then raise exception 'Katılımcı anahtarı gerekli'; end if;
    if r.phase <> 'lobby' or s.status <> 'active' then raise exception 'Sınav başladı; yeni katılım kapalı'; end if;
    if length(trim(coalesce(p_payload->>'fullName',''))) not between 2 and 100 or
      length(trim(coalesce(p_payload->>'store',''))) not between 1 and 100 then raise exception 'Ad soyad ve mağaza bilgilerini girin'; end if;
    if s.session_mode = 'duel' and (select count(*) from public.live_quiz_players where session_id=s.id and active) >= 2 then
      raise exception 'Bu düellonun iki koltuğu da dolu';
    end if;
    insert into public.live_quiz_players(session_id,token_hash,full_name,store,owner_uid)
    values(s.id,md5(p_token::text),trim(p_payload->>'fullName'),trim(p_payload->>'store'),left(p_payload->>'ownerUid',128)) returning * into player;
    if s.session_mode='open' and r.deadline is null then
      r.deadline := n + interval '63 seconds';
      update public.quiz_sessions set lobby_started_at=n where id=s.id;
    end if;
  elsif p_action = 'leave' then
    if player.id is null then raise exception 'Katılımcı doğrulanamadı'; end if;
    update public.live_quiz_players set active=false where id=player.id returning * into player;
  elsif p_action = 'answer' then
    if player.id is null or not player.active then raise exception 'Katılımcı doğrulanamadı'; end if;
    if r.phase <> 'question' or (p_payload->>'questionIndex')::integer is distinct from r.question_index then
      -- Persist expiry below, returning current state instead of rolling it back.
      null;
    elsif not (player.answers ? r.question_index::text) then
      q := r.questions->r.question_index; answer_value := trim(coalesce(p_payload->>'answer',''));
      if length(answer_value) not between 1 and 4000 or
        (q->>'type'='mcq' and not ((q->'options') ? answer_value)) then raise exception 'Geçersiz cevap'; end if;
      used := greatest(0,least(60,extract(epoch from (n-r.started_at))));
      update public.live_quiz_players set answers=answers || jsonb_build_object(r.question_index::text,
        jsonb_build_object('value',answer_value,'timeUsed',round(used,3))) where id=player.id returning * into player;
    end if;
  elsif p_action = 'next' then
    if s.session_mode <> 'duel' then raise exception 'Bu mod otomatik ilerler'; end if;
    if (p_payload->>'questionIndex')::integer is distinct from r.question_index or
      (p_payload->>'phase') is distinct from r.phase then null;
    elsif r.phase = 'lobby' then
      if (select count(*) from public.live_quiz_players where session_id=s.id and active) <> 2 then raise exception 'Başlamak için iki katılımcı gerekli'; end if;
      r.phase := 'question'; r.started_at := n; r.deadline := n + interval '60 seconds';
    elsif r.phase = 'reveal' then
      if r.question_index + 1 >= total then r.phase := 'finished'; r.deadline := null;
      else r.question_index := r.question_index + 1; r.phase := 'question'; r.started_at := n; r.deadline := n + interval '60 seconds'; end if;
    end if;
  end if;

  select count(*), count(*) filter(where answers ? r.question_index::text) into active_count,answered_count
    from public.live_quiz_players where session_id=s.id and active;
  if r.phase='question' and (active_count=0 or answered_count=active_count) then
    r.phase := 'reveal'; r.deadline := n + interval '4 seconds';
  end if;
  update public.live_quiz_rooms set phase=r.phase,question_index=r.question_index,deadline=r.deadline,started_at=r.started_at where session_id=s.id;

  if r.phase='finished' then
    for person in select * from public.live_quiz_players where session_id=s.id and result_id is null loop
      correct_count:=0; xp:=0; mapped_answers:='{}'; times:='[]'; total_used:=0;
      breakdown := '{"easy":0,"medium":0,"hard":0}';
      for i in 0..total-1 loop
        q := r.questions->i; a := person.answers->i::text;
        used := coalesce((a->>'timeUsed')::numeric,60); total_used := total_used+used;
        is_correct := q->>'type'='mcq' and coalesce(a->>'value'=q->>'correctAnswer',false);
        if is_correct then
          correct_count := correct_count+1;
          base := case q->>'difficulty' when 'easy' then 100 when 'hard' then 300 else 200 end;
          xp := xp + round(base*(1-0.5*used/60));
          answer_value := case when q->>'difficulty' in ('easy','hard') then q->>'difficulty' else 'medium' end;
          breakdown := jsonb_set(breakdown,array[answer_value],to_jsonb((breakdown->>answer_value)::integer+1));
        end if;
        if a is not null then mapped_answers := mapped_answers || jsonb_build_object(q->>'id',a->>'value'); end if;
        times := times || jsonb_build_array(jsonb_build_object('questionId',q->>'id','questionText',q->>'text','category',q->>'category',
          'timeSpent',round(used),'status',case when a is null then 'timeout' else 'answered' end,'answered',a->>'value',
          'correct',case when q->>'type'='mcq' then is_correct else null end));
      end loop;
      insert into public.results(company_id,session_id,owner_uid,owner_type,employee,answers,score,time_tracking,submitted_at)
      values(s.company_id,s.id,person.owner_uid,'anonymous',jsonb_build_object('fullName',person.full_name,'store',person.store),mapped_answers,
        jsonb_build_object('correct',correct_count,'total',total,'percent',round(100.0*correct_count/total),'xp',xp,'xpBreakdown',breakdown,
          'timeouts',total-jsonb_object_length_safe(person.answers),'skipped',0),
        jsonb_build_object('totalTime',round(total_used),'averageTimePerQuestion',round(total_used/total),'questionTimes',times),n)
      returning id into result_uuid;
      update public.live_quiz_players set result_id=result_uuid where id=person.id;
    end loop;
    update public.quiz_sessions set status='completed',completed_at=coalesce(completed_at,n) where id=s.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'fullName',p.full_name,'store',p.store,'active',p.active,
    'answered',p.answers ? r.question_index::text,'score',res.score) order by p.joined_at),'[]') into players_json
    from public.live_quiz_players p left join public.results res on res.id=p.result_id where p.session_id=s.id;
  if player.id is not null then select * into player from public.live_quiz_players where id=player.id; end if;
  q := r.questions->r.question_index;
  question_json := case when r.phase in ('question','reveal') and (moderator or player.id is not null) then
    case when r.phase='reveal' or moderator then q else q-'correctAnswer' end else null end;
  return jsonb_build_object('serverNow',clock_timestamp(),'mode',s.session_mode,'phase',r.phase,'questionIndex',r.question_index,
    'total',total,'deadline',r.deadline,'question',question_json,'moderator',moderator,
    'participants',case when moderator or player.id is not null then players_json else '[]'::jsonb end,
    'participantCount',active_count,'answeredCount',answered_count,'playerId',player.id,'active',player.active,
    'answer',player.answers->r.question_index::text->>'value','resultId',player.result_id);
end;
$$;

-- jsonb_object_length is not available on PostgreSQL; keep the count explicit.
create or replace function public.jsonb_object_length_safe(value jsonb) returns integer
language sql immutable set search_path = public, pg_temp as $$ select count(*)::integer from jsonb_object_keys(value) $$;
revoke all on function public.jsonb_object_length_safe(jsonb) from public;
revoke all on function public.live_quiz(uuid,text,uuid,jsonb) from public;
grant execute on function public.live_quiz(uuid,text,uuid,jsonb) to anon, authenticated;
