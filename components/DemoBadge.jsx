const { useState, useEffect } = React;

const DemoBadge = () => {
  const [demoInfo, setDemoInfo] = useState(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    const loadDemoInfo = async () => {
      try {
        const user = getCurrentUser();

        if (!user || !user.isDemo) {
          return;
        }

        // Calculate days left
        if (user.expiryDate) {
          const expiry = new Date(user.expiryDate);
          const now = new Date();
          const diff = expiry - now;
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          setDaysLeft(days > 0 ? days : 0);
        }

        // Get question count
        await waitFirebase();
        const { db, collection, query, where, getDocs } = window.firebase;

        const questionsQuery = query(
          collection(db, 'questions'),
          where('company', '==', user.company)
        );

        const questionsSnapshot = await getDocs(questionsQuery);
        setQuestionCount(questionsSnapshot.size);

        setDemoInfo({
          limits: user.limits || { maxQuestions: 25 },
          expiryDate: user.expiryDate
        });

      } catch (error) {
        window.devError('Demo badge load error:', error);
      }
    };

    loadDemoInfo();

    // Re-check on auth state change
    const handleAuthChange = () => {
      loadDemoInfo();
    };

    window.addEventListener('fb-auth-state', handleAuthChange);
    return () => window.removeEventListener('fb-auth-state', handleAuthChange);
  }, []);

  if (!demoInfo) {
    return null;
  }

  const isExpiringSoon = daysLeft <= 2;
  const isQuotaHigh = questionCount >= demoInfo.limits.maxQuestions * 0.8;

  return (
    <div className={`mb-4 p-4 rounded-lg border-2 ${
      isExpiringSoon ? 'bg-primary-50 border-primary-300' : 'bg-secondary-50 border-secondary-300'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isExpiringSoon ? 'bg-primary-500' : 'bg-secondary-500'
        }`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-dark-900">Demo Hesap</h3>
            {isExpiringSoon && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded-full">
                Son Gün!
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm text-dark-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <span className={isExpiringSoon ? 'font-semibold text-primary-600' : ''}>
                  {daysLeft} gün
                </span> kaldı
              </span>
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>
                <span className={isQuotaHigh ? 'font-semibold text-primary-600' : ''}>
                  {questionCount}/{demoInfo.limits.maxQuestions}
                </span> soru
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <a
              href="mailto:tasdemir_umit@hotmail.com?subject=QuizUp%2B%20Demo%20-%20Bilgi%20Talebi&body=Merhaba%2C%20QuizUp%2B%20demo%20hesab%C4%B1m%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Bize Ulaşın
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

window.DemoBadge = DemoBadge;
