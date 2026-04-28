const { useState, useEffect } = React;

const Tests = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;

    const loadResults = () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const companyId = (() => {
        if (currentUser.isSuperAdmin) {
          try {
            const sel = JSON.parse(localStorage.getItem('superadmin:selectedCompanyData') || 'null');
            if (sel?.id && sel.id !== 'all') return sel.id;
            return null;
          } catch { return null; }
        }
        return currentUser.companyId || null;
      })();

      if (!companyId && !currentUser.isSuperAdmin) {
        setResults([]);
        setLoading(false);
        return;
      }

      unsub = window.db.onResultsSnapshot(companyId, (data) => {
        setResults(data);
        setLoading(false);
      });
    };

    loadResults();

    const handleCompanyChange = () => {
      if (unsub) unsub();
      setLoading(true);
      loadResults();
    };

    window.addEventListener('company-changed', handleCompanyChange);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('company-changed', handleCompanyChange);
    };
  }, []);

  const handleDelete = async (id, sessionId) => {
    if (!confirm('Bu test sonucunu silmek istediğinizden emin misiniz?')) return;

    try {
      await window.db.deleteResult(id);
      toast('Test sonucu silindi', 'success');
    } catch(e) {
      window.devError('Delete result error:', e);
      toast('Sonuç silinirken hata oluştu: ' + e.message, 'error');
    }
  };

  if (loading) return <Page title="Test Sonuçları"><LoadingSpinner text="Sonuçlar yükleniyor..." /></Page>;

  return (
    <Page title="Test Sonuçları" subtitle={`Toplam ${results.length} sonuç`}>
      <div className="grid gap-4">
        {results.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4"><DocumentTextIcon size={64} strokeWidth={1.5} /></div>
            <p className="text-dark-500 text-lg">Henüz tamamlanan test yok</p>
          </div>
        ) : (
          results.map(r => {
            const percent = r.score?.percent || 0;
            const colorClass = percent >= 70 ? 'text-accent-600' : percent >= 50 ? 'text-primary-500' : 'text-red-600';
            const isAbandoned = r.status === 'abandoned';

            return (
              <div key={r.id} className="card p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-lg text-dark-900 break-words">{r.employee?.fullName || 'Personel'}</p>
                      {isAbandoned && (
                        <span className="chip bg-yellow-100 text-yellow-700 text-xs">⚠️ Terk Edildi</span>
                      )}
                    </div>
                    <p className="text-sm text-dark-600 mb-2 break-words">{r.employee?.store || '-'}</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-2xl font-bold text-dark-900">{r.score?.correct || 0}</span>
                        <span className="text-dark-500">/{r.score?.total || 0}</span>
                      </div>
                      <div className={`text-3xl font-black ${colorClass}`}>
                        {percent}%
                      </div>
                    </div>
                    <p className="text-xs text-dark-400 mt-2">{fmtDate(r.submittedAt)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href={`#/result?sessionId=${r.sessionId}&resultId=${r.id}`}
                      className="btn btn-primary text-sm px-4 py-2"
                    >
                      <ChartBarIcon size={16} strokeWidth={2} className="inline" /> Detay
                    </a>
                    <button
                      className="btn btn-danger text-sm px-3 py-2"
                      onClick={() => handleDelete(r.id, r.sessionId)}
                      title="Sil"
                    >
                      <TrashIcon size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Page>
  );
};

window.Tests = Tests;
