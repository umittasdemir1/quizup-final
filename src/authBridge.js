const normalizeProfileUser = (authUser, profile, company) => {
  const role = profile?.is_super_admin || profile?.role === 'SuperAdmin'
    ? 'admin'
    : (profile?.role || 'admin');

  return {
    uid: authUser.id,
    email: authUser.email,
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    company: company?.name || '',
    companyId: profile?.company_id || '',
    companyName: company?.display_name || company?.name || '',
    department: profile?.department || '',
    position: profile?.position || '',
    role,
    supabaseRole: profile?.role || role,
    isSuperAdmin: profile?.is_super_admin === true,
    applicationPin: /^\d{4}$/.test(profile?.application_pin || '') ? profile.application_pin : '',
    sessionsDisabled: profile?.sessions_disabled === true
  };
};

const setLegacyAuthState = (legacyUser) => {
  window.__quizupAuthUser = legacyUser || null;
  window.__quizupAuthReady = true;

  if (!legacyUser) {
    localStorage.removeItem('currentUser');
    window.__quizupCurrentAuthUser = null;
  } else {
    localStorage.setItem('currentUser', JSON.stringify(legacyUser));
    window.__quizupCurrentAuthUser = {
      uid: legacyUser.uid,
      email: legacyUser.email,
      isAnonymous: false
    };
  }

  window.__quizupAuthReady = true;
  window.dispatchEvent(new CustomEvent('quizup-auth-state', {
    detail: { user: window.__quizupCurrentAuthUser, ready: true }
  }));
  window.dispatchEvent(new Event('user-info-updated'));
};

export const loadCurrentSupabaseUser = async () => {
  const { data: userData, error: userError } = await window.supabase.auth.getUser();
  if (userError || !userData?.user) {
    return null;
  }

  const authUser = userData.user;
  const { data: profile, error: profileError } = await window.supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      email,
      company_id,
      department,
      position,
      role,
      is_super_admin,
      application_pin,
      sessions_disabled,
      companies:company_id (
        id,
        name,
        display_name
      )
    `)
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  return normalizeProfileUser(authUser, profile, profile.companies);
};

export const syncSupabaseSessionToLegacyState = async () => {
  const legacyUser = await loadCurrentSupabaseUser();
  setLegacyAuthState(legacyUser);
  return legacyUser;
};

let authSubscription = null;
let authSyncInFlight = Promise.resolve(null);

export const initSupabaseAuthBridge = async () => {
  if (authSubscription) {
    return authSyncInFlight;
  }

  window.__quizupAuthReady = false;
  window.__quizupAuthUser = null;
  window.__quizupAuthReady = false;

  const runSync = () => {
    authSyncInFlight = syncSupabaseSessionToLegacyState().catch((error) => {
      console.warn('[QuizUp] Supabase auth sync failed:', error);
      setLegacyAuthState(null);
      return null;
    });
    return authSyncInFlight;
  };

  const { data } = window.supabase.auth.onAuthStateChange(() => {
    runSync();
  });

  authSubscription = data?.subscription || null;
  return runSync();
};

export const signInWithSupabase = async (email, password) => {
  const { error } = await window.supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return syncSupabaseSessionToLegacyState();
};

export const signOutSupabase = async () => {
  await window.supabase.auth.signOut();
  return authSyncInFlight;
};

window.loadCurrentSupabaseUser = loadCurrentSupabaseUser;
window.syncSupabaseSessionToLegacyState = syncSupabaseSessionToLegacyState;
window.initSupabaseAuthBridge = initSupabaseAuthBridge;
window.signInWithSupabase = signInWithSupabase;
window.signOutSupabase = signOutSupabase;
