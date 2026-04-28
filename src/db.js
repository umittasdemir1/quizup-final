// src/db.js — Supabase veri katmanı
// Legacy componentlerin kullandığı veri işlemlerinin Supabase karşılığı
// window.db olarak expose edilir, legacy componentler buradan okur

import { supabase } from './supabaseClient.js';

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

const isUUID = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const getUid = () => {
  try { return JSON.parse(localStorage.getItem('currentUser') || 'null')?.uid || null; }
  catch { return null; }
};

async function callAdminUsersFunction(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Legacy snapshot API → polling tabanlı abonelik (3 sn aralık)
function createSubscription(fetchFn, callback, ms = 3000) {
  let active = true;
  let timer;
  const poll = async () => {
    if (!active) return;
    try { callback(await fetchFn()); } catch (e) { console.warn('[db]', e.message); }
    if (active) timer = setTimeout(poll, ms);
  };
  poll();
  return () => { active = false; clearTimeout(timer); };
}

// ─── Mapping fonksiyonları ────────────────────────────────────────────────────

const mapQuestion = (q) => ({
  id: q.id,
  _supabaseId: q.id,
  questionText: q.question_text,
  type: q.type,
  category: q.category,
  difficulty: q.difficulty,
  options: q.options || [],
  correctAnswer: q.correct_answer,
  isActive: q.is_active,
  hasTimer: q.has_timer,
  timerSeconds: q.timer_seconds,
  questionImageUrl: q.question_image_url || '',
  hasQuestionImage: q.has_question_image,
  hasImageOptions: q.has_image_options,
  optionImageUrls: q.option_image_urls || [],
  order: q.sort_order,
  examType: q.exam_type,
  company: q.companies?.name || '',
  companyId: q.company_id,
  createdBy: q.created_by,
  createdAt: q.created_at,
  updatedAt: q.updated_at,
});

const mapSession = (s) => ({
  id: s.id,
  _supabaseId: s.id,
  employee: s.employee || {},
  createdBy: s.created_by,
  createdByApplicationPin: s.created_by_application_pin,
  company: s.companies?.name || '',
  companyId: s.company_id,
  questionIds: s.question_ids || [],
  _questionSupabaseIds: s.question_ids || [],
  status: s.status,
  createdAt: s.created_at,
  completedAt: s.completed_at,
});

const mapResult = (r) => ({
  id: r.id,
  _supabaseId: r.id,
  ownerUid: r.owner_uid,
  ownerType: r.owner_type,
  sessionId: r.session_id,
  _sessionSupabaseId: r.session_id,
  employee: r.employee || {},
  company: r.companies?.name || '',
  companyId: r.company_id,
  answers: r.answers || {},
  score: r.score || {},
  timeTracking: r.time_tracking || {},
  location: r.location || {},
  submittedAt: r.submitted_at,
  createdAt: r.created_at,
  status: r.status,
});

const mapPackage = (p) => ({
  id: p.id,
  _supabaseId: p.id,
  name: p.name,
  questionIds: p.question_ids || [],
  _questionSupabaseIds: p.question_ids || [],
  questionCount: p.question_count,
  isActive: p.is_active,
  createdBy: p.created_by,
  createdByName: p.created_by_name,
  company: p.companies?.name || '',
  companyId: p.company_id,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

const mapProfile = (p) => ({
  id: p.id,
  _supabaseId: p.id,
  uid: p.id,
  firstName: p.first_name || '',
  lastName: p.last_name || '',
  email: p.email || '',
  company: p.companies?.name || '',
  companyId: p.company_id,
  department: p.department || '',
  position: p.position || '',
  role: p.role || 'admin',
  isSuperAdmin: p.is_super_admin || false,
  applicationPin: p.application_pin || '',
  sessionsDisabled: p.sessions_disabled || false,
  createdBy: p.created_by,
  createdAt: p.created_at,
});

const mapCompany = (c) => ({
  id: c.id,
  _supabaseId: c.id,
  name: c.name,
  displayName: c.display_name,
  plan: c.plan || 'premium',
  maxUsers: c.max_users || 250,
  active: c.active !== false,
  isDemo: c.is_demo || false,
  expiryDate: c.expiry_date,
  limits: c.limits || {},
  createdAt: c.created_at,
  updatedAt: c.updated_at,
});

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

async function getQuestions({ companyId, activeOnly = false } = {}) {
  let q = supabase
    .from('questions')
    .select('*, companies:company_id(name)')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapQuestion);
}

async function getQuestionsByIds(ids) {
  if (!ids?.length) return [];
  const uuids = ids.filter(isUUID);
  if (!uuids.length) return [];
  const { data } = await supabase.from('questions').select('*, companies:company_id(name)').in('id', uuids);
  const rows = data || [];
  const byId = new Map();
  rows.forEach((r) => { if (r.id) byId.set(r.id, r); });
  return ids.map((id) => (byId.has(id) ? mapQuestion(byId.get(id)) : null)).filter(Boolean);
}

function onQuestionsSnapshot(companyId, callback) {
  return createSubscription(() => getQuestions({ companyId }), (data) => {
    // Eski onSnapshot callback formatı: snap objesi değil direkt dizi
    callback(data);
  });
}

async function addQuestion(data, companyId) {
  const row = {
    company_id: companyId,
    question_text: data.questionText,
    type: data.type || 'mcq',
    category: data.category || null,
    difficulty: data.difficulty || null,
    options: Array.isArray(data.options) ? data.options : [],
    correct_answer: data.correctAnswer || null,
    is_active: data.isActive !== false,
    has_timer: data.hasTimer || false,
    timer_seconds: data.timerSeconds || null,
    question_image_url: data.questionImageUrl || '',
    has_question_image: data.hasQuestionImage || false,
    has_image_options: data.hasImageOptions || false,
    option_image_urls: Array.isArray(data.optionImageUrls) ? data.optionImageUrls : [],
    sort_order: data.order || null,
    exam_type: data.examType || null,
    created_by: data.createdBy || getUid(),
  };
  const { data: result, error } = await supabase.from('questions').insert(row).select('*, companies:company_id(name)').single();
  if (error) throw error;
  return mapQuestion(result);
}

async function updateQuestion(questionId, data) {
  const row = {};
  const map = {
    questionText: 'question_text', type: 'type', category: 'category',
    difficulty: 'difficulty', options: 'options', correctAnswer: 'correct_answer',
    isActive: 'is_active', hasTimer: 'has_timer', timerSeconds: 'timer_seconds',
    questionImageUrl: 'question_image_url', hasQuestionImage: 'has_question_image',
    hasImageOptions: 'has_image_options', optionImageUrls: 'option_image_urls',
    order: 'sort_order', examType: 'exam_type',
  };
  for (const [k, v] of Object.entries(map)) {
    if (data[k] !== undefined) row[v] = data[k];
  }
  const { error } = await supabase.from('questions').update(row).eq('id', questionId);
  if (error) throw error;
}

async function deleteQuestion(questionId) {
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) throw error;
}

// ─── QUIZ SESSIONS ────────────────────────────────────────────────────────────

async function getSessions(companyId) {
  let q = supabase
    .from('quiz_sessions')
    .select('*, companies:company_id(name)')
    .order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapSession);
}

async function getSessionById(sessionId) {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*, companies:company_id(name)')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSession(data) : null;
}

function onSessionsSnapshot(companyId, callback) {
  return createSubscription(() => getSessions(companyId), callback);
}

async function addSession(data, companyId) {
  const questionIds = (data.questionIds || []).filter(isUUID);
  const row = {
    company_id: companyId,
    employee: data.employee || {},
    created_by: data.createdBy || getUid(),
    created_by_application_pin: data.createdByApplicationPin || null,
    question_ids: questionIds,
    status: 'active',
  };
  const { data: result, error } = await supabase.from('quiz_sessions').insert(row).select('*, companies:company_id(name)').single();
  if (error) throw error;
  return mapSession(result);
}

async function updateSession(sessionId, data) {
  const row = {};
  if (data.status !== undefined) { row.status = data.status; if (data.status === 'completed') row.completed_at = new Date().toISOString(); }
  const { error } = await supabase.from('quiz_sessions').update(row).eq('id', sessionId);
  if (error) throw error;
}

async function deleteSession(sessionId) {
  const { error } = await supabase.from('quiz_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

// ─── RESULTS ─────────────────────────────────────────────────────────────────

async function getResults({ companyId, sessionId, ownerUid } = {}) {
  let q = supabase.from('results').select('*, companies:company_id(name)').order('submitted_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  if (sessionId) q = q.eq('session_id', sessionId);
  if (ownerUid) q = q.eq('owner_uid', ownerUid);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapResult);
}

async function getResultById(resultId) {
  const { data, error } = await supabase
    .from('results').select('*, companies:company_id(name)')
    .eq('id', resultId).maybeSingle();
  if (error) throw error;
  return data ? mapResult(data) : null;
}

function onResultsSnapshot(companyId, callback) {
  return createSubscription(() => getResults({ companyId }), callback);
}

async function addResult(data, companyId) {
  const sessionSupabaseId = isUUID(data.sessionId) ? data.sessionId : null;
  const row = {
    company_id: companyId,
    session_id: sessionSupabaseId,
    owner_uid: data.ownerUid || data.owner_uid || null,
    owner_type: data.ownerType || 'anonymous',
    employee: data.employee || {},
    answers: data.answers || {},
    score: data.score || {},
    time_tracking: data.timeTracking || data.time_tracking || {},
    location: data.location || {},
    submitted_at: data.submittedAt || new Date().toISOString(),
  };
  const { data: result, error } = await supabase.from('results').insert(row).select('*, companies:company_id(name)').single();
  if (error) throw error;
  return mapResult(result);
}

async function deleteResult(resultId) {
  const { error } = await supabase.from('results').delete().eq('id', resultId);
  if (error) throw error;
}

// ─── QUESTION PACKAGES ────────────────────────────────────────────────────────

async function getPackages({ companyId, createdBy } = {}) {
  let q = supabase.from('question_packages').select('*, companies:company_id(name)').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  if (createdBy) q = q.eq('created_by', createdBy);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapPackage);
}

function onPackagesSnapshot(companyId, createdBy, callback) {
  return createSubscription(() => getPackages({ companyId, createdBy }), callback);
}

async function addPackage(data, companyId) {
  const questionIds = (data.questionIds || []).filter(isUUID);
  const row = {
    company_id: companyId,
    name: data.name,
    question_ids: questionIds,
    question_count: data.questionCount || questionIds.length,
    is_active: true,
    created_by: data.createdBy || getUid(),
    created_by_name: data.createdByName || null,
  };
  const { data: result, error } = await supabase.from('question_packages').insert(row).select('*, companies:company_id(name)').single();
  if (error) throw error;
  return mapPackage(result);
}

async function deletePackage(packageId) {
  const { error } = await supabase.from('question_packages').delete().eq('id', packageId);
  if (error) throw error;
}

// ─── BRANDING ────────────────────────────────────────────────────────────────

async function resolveCompanyId(nameOrId) {
  if (isUUID(nameOrId)) return nameOrId;
  const { data } = await supabase.from('companies').select('id').eq('name', nameOrId).maybeSingle();
  return data?.id || null;
}

async function getBranding(companyNameOrId) {
  const companyId = await resolveCompanyId(companyNameOrId);
  if (!companyId) return null;
  const { data, error } = await supabase.from('branding').select('*').eq('company_id', companyId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { logoUrl: data.logo_url || '', searchPlaceholderWords: data.search_placeholder_words || '', company: companyNameOrId, companyId, updatedAt: data.updated_at };
}

async function setBranding(companyNameOrId, data) {
  const companyId = await resolveCompanyId(companyNameOrId);
  if (!companyId) throw new Error('Şirket bulunamadı: ' + companyNameOrId);
  const row = { company_id: companyId, updated_at: new Date().toISOString() };
  if (data.logoUrl !== undefined) row.logo_url = data.logoUrl;
  if (data.searchPlaceholderWords !== undefined) row.search_placeholder_words = data.searchPlaceholderWords;
  const { error } = await supabase.from('branding').upsert(row, { onConflict: 'company_id' });
  if (error) throw error;
}

// ─── PROFILES ────────────────────────────────────────────────────────────────

async function getProfiles({ companyId, all } = {}) {
  let q = supabase.from('profiles').select('*, companies:company_id(id, name)').order('created_at', { ascending: false });
  if (!all && companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapProfile);
}

async function getProfileById(uid) {
  if (!isUUID(uid)) return null;
  const { data, error } = await supabase.from('profiles').select('*, companies:company_id(id, name)').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

async function updateProfile(uid, updates) {
  if (!isUUID(uid)) throw new Error('Invalid profile id');
  const map = {
    firstName: 'first_name', lastName: 'last_name', email: 'email',
    role: 'role', position: 'position', department: 'department',
    applicationPin: 'application_pin', sessionsDisabled: 'sessions_disabled',
  };
  const row = {};
  for (const [k, v] of Object.entries(map)) { if (updates[k] !== undefined) row[v] = updates[k]; }
  const { error } = await supabase.from('profiles').update(row).eq('id', uid);
  if (error) throw error;
}

async function deleteProfile(uid) {
  return callAdminUsersFunction('delete-user', { userId: uid });
}

async function createUser({ email, password, firstName, lastName, role, companyId, position, department, applicationPin, createdBy }) {
  return callAdminUsersFunction('create-user', {
    email,
    password,
    firstName,
    lastName,
    role,
    companyId,
    position,
    department,
    applicationPin,
    createdBy,
  });
}

async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// ─── COMPANIES ────────────────────────────────────────────────────────────────

async function getCompanies() {
  const { data, error } = await supabase.from('companies').select('*').order('name');
  if (error) throw error;
  return (data || []).map(mapCompany);
}

async function addCompany(data) {
  const row = { name: data.name, display_name: data.displayName || null, plan: data.plan || 'premium', max_users: data.maxUsers || 250, active: data.active !== false, is_demo: false };
  const { data: result, error } = await supabase.from('companies').insert(row).select().single();
  if (error) throw error;
  return mapCompany(result);
}

async function updateCompany(companyId, data) {
  const row = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.plan !== undefined) row.plan = data.plan;
  if (data.maxUsers !== undefined) row.max_users = data.maxUsers;
  if (data.active !== undefined) row.active = data.active;
  const { error } = await supabase.from('companies').update(row).eq('id', companyId);
  if (error) throw error;
}

async function deleteCompany(companyId) {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) throw error;
}

// ─── SUGGESTED QUESTIONS ─────────────────────────────────────────────────────

async function getSuggestedQuestions(companyId) {
  let q = supabase
    .from('suggested_questions')
    .select('*, companies:company_id(name)')
    .order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((sq) => {
    const suggestedBy = sq.suggested_by || {};
    const question = suggestedBy.question || {};
    const { question: _question, ...suggestor } = suggestedBy;
    return {
      id: sq.id,
      _supabaseId: sq.id,
      questionText: sq.question_text,
      type: question.type || 'mcq',
      category: sq.category || question.category || '',
      difficulty: question.difficulty || 'medium',
      options: question.options || ['', '', '', ''],
      correctAnswer: question.correctAnswer || '',
      hasTimer: question.hasTimer || false,
      timerSeconds: question.timerSeconds || 60,
      hasQuestionImage: question.hasQuestionImage || Boolean(question.questionImageUrl),
      questionImageUrl: question.questionImageUrl || '',
      hasImageOptions: question.hasImageOptions || false,
      optionImageUrls: question.optionImageUrls || ['', '', '', ''],
      status: question.status || 'pending',
      company: sq.companies?.name || '',
      companyId: sq.company_id,
      suggestedBy: suggestor,
      createdAt: sq.created_at,
    };
  });
}

async function addSuggestedQuestion(data, companyId) {
  const { suggestedBy = null, ...question } = data;
  const row = {
    company_id: companyId,
    question_text: data.questionText || data.text || '',
    category: data.category || null,
    suggested_by: {
      ...(suggestedBy || {}),
      question,
    },
  };
  const { data: result, error } = await supabase.from('suggested_questions').insert(row).select().single();
  if (error) throw error;
  return result;
}

async function deleteSuggestedQuestion(id) {
  const { error } = await supabase.from('suggested_questions').delete().eq('id', id);
  if (error) throw error;
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

async function getSetting(key) {
  if (key === 'branding') {
    // Legacy: result.jsx bu endpointi logo için çağırır
    const b = await getBranding('QuizUp').catch(() => null);
    return b || { logoUrl: '', searchPlaceholderWords: '' };
  }
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data?.value || null;
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

const BUCKET = 'quizup';

async function uploadFile(path, file) {
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

async function deleteFile(path) {
  // Dış URL'leri silmeye çalışma; sadece Supabase bucket path'lerini sil.
  if (/^https?:\/\//i.test(path || '')) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('[db.storage]', error.message);
}

// ─── SESSION TRACKING ────────────────────────────────────────────────────────

async function updateSessionHeartbeat(userId, sessionId) {
  try {
    await supabase.rpc('update_active_session', {
      p_user_id: isUUID(userId) ? userId : (await getProfileById(userId))?._supabaseId,
      p_session_id: sessionId,
      p_session_data: JSON.stringify({ lastActiveAt: new Date().toISOString() }),
    });
  } catch (e) { console.warn('[db] heartbeat:', e.message); }
}

async function registerSession(userId, sessionId, sessionData) {
  try {
    const supabaseId = isUUID(userId) ? userId : (await getProfileById(userId))?._supabaseId;
    if (!supabaseId) return;
    await supabase.rpc('update_active_session', {
      p_user_id: supabaseId,
      p_session_id: sessionId,
      p_session_data: JSON.stringify({ device: sessionData?.device || navigator.userAgent, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() }),
    });
  } catch (e) { console.warn('[db] registerSession:', e.message); }
}

async function removeSession(userId, sessionId) {
  try {
    const supabaseId = isUUID(userId) ? userId : (await getProfileById(userId))?._supabaseId;
    if (!supabaseId) return;
    await supabase.rpc('remove_active_session', { p_user_id: supabaseId, p_session_id: sessionId });
  } catch (e) { console.warn('[db] removeSession:', e.message); }
}

// ─── Export ───────────────────────────────────────────────────────────────────

const db = {
  getQuestions, getQuestionsByIds, onQuestionsSnapshot, addQuestion, updateQuestion, deleteQuestion,
  getSessions, getSessionById, onSessionsSnapshot, addSession, updateSession, deleteSession,
  getResults, getResultById, onResultsSnapshot, addResult, deleteResult,
  getPackages, onPackagesSnapshot, addPackage, deletePackage,
  getBranding, setBranding,
  getProfiles, getProfileById, updateProfile, deleteProfile,
  getCompanies, addCompany, updateCompany, deleteCompany,
  getSuggestedQuestions, addSuggestedQuestion, deleteSuggestedQuestion,
  getSetting, resolveCompanyId,
  uploadFile, deleteFile,
  updateSessionHeartbeat, registerSession, removeSession,
  createUser, resetPasswordForEmail,
};

window.db = db;
export default db;
