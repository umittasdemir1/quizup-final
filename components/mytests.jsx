const { useState, useEffect } = React;

const MyTests = () => {
  const [myTests, setMyTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get or create anonymous user ID
  const getAnonymousId = () => {
    let anonId = localStorage.getItem('anonUserId');
    if (!anonId) {
      anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('anonUserId', anonId);
    }
    return anonId;
  };

  useEffect(() => {
    loadMyTests();
  }, []);

  const loadMyTests = async () => {
    try {
      const anonId = getAnonymousId();

      // Get test IDs from localStorage
      const myTestIds = JSON.parse(localStorage.getItem(`tests_${anonId}`) || '[]');

      if (myTestIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch test results from Firebase
      await waitFirebase();
      const { db, doc, getDoc } = window.firebase;

      const staleIds = new Set();
      const tests = [];

      for (const testId of myTestIds) {
        try {
          const resultDoc = await getDoc(doc(db, 'results', testId));
          if (resultDoc.exists()) {
            tests.push({ id: resultDoc.id, ...resultDoc.data() });
          } else {
            staleIds.add(testId);
          }
        } catch (e) {
          const code = e?.code || '';
          if (code === 'permission-denied') {
            staleIds.add(testId);
            console.warn('Erişim izni olmayan test kaydı kaldırılıyor:', testId);
          } else {
            console.error('Test yüklenirken hata:', testId, e);
          }
        }
      }

      if (staleIds.size > 0) {
        const filteredIds = myTestIds.filter(id => !staleIds.has(id));
        localStorage.setItem(`tests_${anonId}`, JSON.stringify(filteredIds));
        if (staleIds.size === myTestIds.length) {
          toast('Eski test kayıtlarına erişilemiyor. Lütfen yeni bir quiz başlatın.', 'warning');
        } else {
          toast('Bazı eski test kayıtlarına erişilemiyor ve listeden kaldırıldı.', 'info');
        }
      }

      setMyTests(tests.sort((a, b) => {
        const aTime = a.submittedAt?.toMillis?.() || 0;
        const bTime = b.submittedAt?.toMillis?.() || 0;
        return bTime - aTime;
      }));
    } catch (e) {
      console.error('Load my tests error:', e);
      toast('Testleriniz yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Page title="Testlerim"><LoadingSpinner /></Page>;

  return (
    <Page title="📝 Testlerim" subtitle={`${myTests.length} test tamamlandı`}>
      {myTests.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-dark-500 text-lg mb-4">Henüz test tamamlamadınız</p>
          <a href="#/" className="btn btn-primary">
            Quiz'e Başla
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {myTests.map((test) => {
            const percent = test.score?.percent || 0;
            const correct = test.score?.correct || 0;
            const total = test.score?.total || 0;

            return (
              <div key={test.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="text-3xl font-black"
                        style={{
                          color: percent >= 70 ? '#5EC5B6' : percent >= 50 ? '#FF6B4A' : '#dc2626'
                        }}
                      >
                        {percent}%
                      </div>
                      <div className="text-dark-600">
                        <div className="font-semibold">{correct}/{total} Doğru</div>
                        <div className="text-sm text-dark-500">
                          {fmtDate(test.submittedAt)}
                        </div>
                      </div>
                    </div>

                    {test.employee && (
                      <div className="text-sm text-dark-600">
                        <span className="font-semibold">{test.employee.fullName}</span>
                        {test.employee.store && <span> • {test.employee.store}</span>}
                      </div>
                    )}

                    {test.timeTracking && (
                      <div className="flex gap-3 mt-2 text-sm">
                        <span className="chip chip-blue">
                          ⏱️ {Math.floor(test.timeTracking.totalTime / 60)}dk {test.timeTracking.totalTime % 60}sn
                        </span>
                        <span className="chip bg-gray-100 text-gray-700">
                          {test.score?.total || 0} soru
                        </span>
                      </div>
                    )}
                  </div>

                  <a
                    href={`#/result?sessionId=${test.sessionId}&resultId=${test.id}`}
                    className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                  >
                    📊 Detay
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-center">
        <a href="#/" className="btn btn-primary">
          🆕 Yeni Quiz Başlat
        </a>
      </div>
    </Page>
  );
};

window.MyTests = MyTests;
