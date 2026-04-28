import { useEffect, useState } from 'react';

const App = () => {
  window.useAnon?.();
  const route = window.useHash ? window.useHash() : window.location.hash.slice(1) || '/';
  const [authReady, setAuthReady] = useState(Boolean(window.__quizupAuthReady));

  useEffect(() => {
    window.scrollTo(0, 0);
    window.logPageView?.(route || '/');
  }, [route]);

  useEffect(() => {
    if (window.__quizupAuthReady) {
      setAuthReady(true);
    }

    const handleAuth = (event) => {
      if (event?.detail?.ready) {
        setAuthReady(true);
      }
    };

    window.addEventListener('quizup-auth-state', handleAuth);
    return () => window.removeEventListener('quizup-auth-state', handleAuth);
  }, []);

  const LoadingSpinner = window.LoadingSpinner;
  const Page = window.Page;

  if (!authReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        {LoadingSpinner ? <LoadingSpinner text="Oturum doğrulanıyor..." /> : null}
      </main>
    );
  }

  const Sidebar = window.Sidebar;
  const ScrollToTop = window.ScrollToTop;
  const Landing = window.Landing;
  const Login = window.Login;
  const CompanyManagement = window.CompanyManagement;
  const UserManagement = window.UserManagement;
  const SuggestedQuestions = window.SuggestedQuestions;
  const SuggestQuestion = window.SuggestQuestion;
  const MyTests = window.MyTests;
  const QuestionBank = window.QuestionBank;
  const Branding = window.Branding;
  const Dashboard = window.Dashboard;
  const Quiz = window.Quiz;
  const Result = window.Result;
  const Manager = window.Manager;
  const Tests = window.Tests;
  const Admin = window.Admin;

  const isLoggedIn = window.isLoggedIn || (() => false);
  const isSuperAdmin = window.isSuperAdmin || (() => false);
  const hasRole = window.hasRole || (() => false);
  const requireAuth = window.requireAuth || (() => false);
  const toast = window.toast || (() => {});

  return (
    <>
      {Sidebar ? <Sidebar /> : null}
      <main>
        {route === '/' || route === '' ? <Landing />
          : route.startsWith('/login') ? <Login />
          : route.startsWith('/company-management') ? (isLoggedIn() && isSuperAdmin() ? <CompanyManagement /> : (() => { requireAuth('admin'); toast('Bu sayfaya sadece Super Admin erişebilir', 'error'); location.hash = '#/dashboard'; return null; })())
          : route.startsWith('/users') ? (isLoggedIn() && hasRole('admin') ? <UserManagement /> : (() => { requireAuth('admin'); return null; })())
          : route.startsWith('/suggestions') ? (isLoggedIn() && hasRole('admin') ? <SuggestedQuestions /> : (() => { requireAuth('admin'); return null; })())
          : route.startsWith('/suggest') ? <SuggestQuestion />
          : route.startsWith('/mytests') ? <MyTests />
          : route.startsWith('/questions') ? (isLoggedIn() && hasRole(['admin', 'manager']) ? <QuestionBank /> : (() => { requireAuth(['admin', 'manager']); return null; })())
          : route.startsWith('/branding') ? (isLoggedIn() && hasRole('admin') ? <Branding /> : (() => { requireAuth('admin'); return null; })())
          : route.startsWith('/dashboard') ? (isLoggedIn() && hasRole(['admin', 'manager']) ? <Dashboard /> : (() => { requireAuth(['admin', 'manager']); return null; })())
          : route.startsWith('/quiz/') ? <Quiz sessionId={route.split('/')[2]} />
          : route.startsWith('/result') ? (() => {
              const params = new URLSearchParams(route.split('?')[1] || '');
              return <Result sessionId={params.get('sessionId')} resultId={params.get('resultId')} />;
            })()
          : route.startsWith('/manager') ? (isLoggedIn() && hasRole(['admin', 'manager']) ? <Manager /> : (() => { requireAuth(['admin', 'manager']); return null; })())
          : route.startsWith('/tests') ? (isLoggedIn() ? <Tests /> : (() => { requireAuth(); return null; })())
          : route.startsWith('/admin') ? (isLoggedIn() && hasRole('admin') ? <Admin /> : (() => { requireAuth('admin'); return null; })())
          : <Landing />
        }
      </main>
      {ScrollToTop ? <ScrollToTop /> : null}
      {!Landing && Page ? <Page title="Uygulama yüklenemedi" /> : null}
    </>
  );
};

export default App;

