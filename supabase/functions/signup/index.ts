/// <reference path="../deno.d.ts" />

// Public self-service signup (Model A: her kayıt yeni bir firma + admin oluşturur).
// E-posta doğrulaması yok: kullanıcı service role ile email_confirm:true olarak oluşturulur,
// böylece SMTP gerekmeden anında giriş yapabilir (ücretsiz Supabase ile uyumlu).

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase environment variables are missing' }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const firstName = String(payload.firstName || '').trim();
  const lastName = String(payload.lastName || '').trim();
  const companyName = String(payload.companyName || '').trim();

  if (!email || !password || !firstName || !lastName || !companyName) {
    return json({ error: 'Tüm alanlar zorunludur' }, 400);
  }

  if (!isEmail(email)) {
    return json({ error: 'Geçersiz e-posta adresi' }, 400);
  }

  if (password.length < 6) {
    return json({ error: 'Şifre en az 6 karakter olmalı' }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Auth kullanıcısını oluştur (doğrulanmış olarak → anında giriş yapabilir)
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createError || !created.user) {
    const msg = createError?.message || '';
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
      return json({ error: 'Bu e-posta adresi zaten kayıtlı' }, 409);
    }
    return json({ error: msg || 'Kullanıcı oluşturulamadı' }, 400);
  }

  const userId = created.user.id;

  // 2) Firma oluştur
  const { data: company, error: companyError } = await adminClient
    .from('companies')
    .insert({
      name: companyName,
      display_name: companyName,
      plan: 'free',
      active: true,
      is_demo: false,
      created_by: userId,
    })
    .select('id')
    .single();

  if (companyError || !company) {
    await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    return json({ error: companyError?.message || 'Firma oluşturulamadı' }, 400);
  }

  // 3) Admin profilini oluştur
  const { error: profileError } = await adminClient.from('profiles').insert({
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    role: 'admin',
    company_id: company.id,
    is_super_admin: false,
    created_by: userId,
  });

  if (profileError) {
    await adminClient.from('companies').delete().eq('id', company.id).catch(() => {});
    await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    return json({ error: profileError.message }, 400);
  }

  return json({ uid: userId, email, companyId: company.id });
});
