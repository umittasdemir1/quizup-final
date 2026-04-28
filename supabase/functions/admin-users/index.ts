/// <reference path="../deno.d.ts" />

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

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Supabase environment variables are missing' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Authorization header is required' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { data: caller, error: callerError } = await adminClient
    .from('profiles')
    .select('id, company_id, role, is_super_admin')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (callerError) {
    return json({ error: callerError.message }, 500);
  }

  const isSuperAdmin = caller?.is_super_admin === true;
  const isAdmin = caller?.role === 'admin' || caller?.role === 'SuperAdmin' || isSuperAdmin;

  if (!caller || !isAdmin) {
    return json({ error: 'Admin permission required' }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = payload.action;

  if (action === 'create-user') {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const role = String(payload.role || 'manager').trim();
    const companyId = String(payload.companyId || '').trim();
    const applicationPin = String(payload.applicationPin || '').trim();

    if (!email || !password || !firstName || !lastName || !companyId || !applicationPin) {
      return json({ error: 'Missing required user fields' }, 400);
    }

    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400);
    }

    if (!isUuid(companyId)) {
      return json({ error: 'Invalid company id' }, 400);
    }

    if (!/^\d{4}$/.test(applicationPin)) {
      return json({ error: 'Application PIN must be 4 digits' }, 400);
    }

    if (!isSuperAdmin && companyId !== caller.company_id) {
      return json({ error: 'Cannot create users outside your company' }, 403);
    }

    if (!isSuperAdmin && role === 'SuperAdmin') {
      return json({ error: 'Cannot grant super admin role' }, 403);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return json({ error: createError?.message || 'User could not be created' }, 400);
    }

    const userId = created.user.id;
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: role || 'manager',
      company_id: companyId,
      position: payload.position || null,
      department: payload.department || null,
      application_pin: applicationPin,
      created_by: caller.id,
      is_super_admin: false,
    }, { onConflict: 'id' });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId).catch(() => {});
      return json({ error: profileError.message }, 400);
    }

    return json({ uid: userId, email });
  }

  if (action === 'delete-user') {
    const userId = String(payload.userId || '').trim();
    if (!userId) {
      return json({ error: 'userId is required' }, 400);
    }

    if (!isUuid(userId)) {
      return json({ error: 'Invalid user id' }, 400);
    }

    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id, company_id, is_super_admin')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      return json({ error: targetError.message }, 500);
    }

    if (!target) {
      return json({ ok: true });
    }

    if (target.id === caller.id) {
      return json({ error: 'Cannot delete your own user' }, 400);
    }

    if (!isSuperAdmin && target.company_id !== caller.company_id) {
      return json({ error: 'Cannot delete users outside your company' }, 403);
    }

    if (!isSuperAdmin && target.is_super_admin) {
      return json({ error: 'Cannot delete a super admin user' }, 403);
    }

    const deleteAuth = async () => adminClient.auth.admin.deleteUser(target.id);
    let deleteResult = await deleteAuth();

    if (deleteResult.error) {
      await adminClient.from('profiles').delete().eq('id', target.id);
      deleteResult = await deleteAuth();
    }

    if (deleteResult.error) {
      return json({ error: deleteResult.error.message }, 400);
    }

    await adminClient.from('profiles').delete().eq('id', target.id);
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
