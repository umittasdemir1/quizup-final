const { useState, useEffect } = React;

const Tests = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await waitFirebase();
      const { db, collection, query, orderBy, onSnapshot } = window.firebase;
      const q = query(collection(db, 'results'), orderBy('submittedAt', 'desc'));
      const unsub = onSnapshot(q, snap => {
        setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (error) => {
        console.error('Error loading results:', error);
        toast('Sonuçlar yüklenirken hata oluştu', 'error');
        setLoading(false);
      });
      return () => unsub();
    })();
  }, []);

  const handleDelete = async (id, sessionId) => {
    if (!confirm('Bu test sonucunu silmek istediğinizden emin misiniz?')) return;
    
    try {
      await waitFirebase();
      const { db, doc, deleteDoc, collection, query, where, getDocs } = window.firebase;
      
      // Delete the result
      await deleteDoc(doc(db, 'results', id));
      
      // Check if there are other results for this session
      const q = query(collection(db, 'results'), where('sessionId', '==', sessionId));
      const snapshot = await getDocs(q);
      
      // If no more results exist for this session, optionally delete the session too
      // (Commented out - you can enable if you want to auto-delete empty sessions)
      // if (snapshot.empty) {
      //   await deleteDoc(doc(db, 'quizSessions', sessionId));
      //   toast('Sonuç ve ilgili oturum silindi', 'success');
      // } else {
      //   toast('Sonuç silindi', 'success');
      // }
      
      toast('Test sonucu silindi', 'success');
    } catch(e) {
      console.error('Delete result error:', e);
      toast('Sonuç silinirken hata oluştu: ' + e.message, 'error');
    }
  };

  if (loading) return <Page title="Test Sonuçları"><LoadingSpinner text="Sonuçlar yükleniyor..." /></Page>;

  return (
    <Page title="Test Sonuçları" subtitle={`Toplam ${results.length} sonuç`}>
      <div className="grid gap-4">
        {results.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-dark-500 text-lg">Henüz tamamlanan test yok</p>
          </div>
        ) : (
          results.map(r => {
            const percent = r.score?.percent || 0;
            const colorClass = percent >= 70 ? 'text-accent-600' : percent >= 50 ? 'text-primary-500' : 'text-red-600';
            
            return (
              <div key={r.id} className="card p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <p className="font-semibold text-lg text-dark-900 break-words">{r.employee?.fullName || 'Personel'}</p>
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
                      📊 Detay
                    </a>
                    <button 
                      className="btn btn-danger text-sm px-3 py-2" 
                      onClick={() => handleDelete(r.id, r.sessionId)}
                      title="Sil"
                    >
                      🗑️
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
