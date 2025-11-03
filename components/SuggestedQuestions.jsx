const { useState, useEffect } = React;

const SuggestedQuestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Auth check - only admin
  useEffect(() => {
    if (!requireAuth('admin')) return;
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      await waitFirebase();
      const { db, collection, getDocs, query, orderBy } = window.firebase;
      const q = query(collection(db, 'suggestedQuestions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSuggestions(data);
    } catch (e) {
      console.error('Load suggestions error:', e);
      toast('Öneriler yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const approveSuggestion = async (suggestion) => {
    if (!confirm('Bu soruyu soru havuzuna eklemek istediğinizden emin misiniz?')) return;

    setProcessing(true);
    try {
      await waitFirebase();
      const { db, collection, addDoc, doc, updateDoc, serverTimestamp } = window.firebase;

      // Add to questions collection
      const questionData = {
        questionText: suggestion.questionText,
        type: suggestion.type,
        category: suggestion.category,
        difficulty: suggestion.difficulty,
        options: suggestion.options || [],
        correctAnswer: suggestion.correctAnswer || '',
        hasTimer: suggestion.hasTimer || false,
        timerSeconds: suggestion.timerSeconds || 60,
        hasImageOptions: suggestion.hasImageOptions || false,
        optionImageUrls: suggestion.optionImageUrls || [],
        questionImageUrl: suggestion.questionImageUrl || '',
        active: true,
        createdAt: serverTimestamp(),
        suggestedBy: suggestion.suggestedBy
      };

      await addDoc(collection(db, 'questions'), questionData);

      // Update suggestion status
      await updateDoc(doc(db, 'suggestedQuestions', suggestion.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: getCurrentUser().uid
      });

      toast('Soru havuzuna eklendi!', 'success');
      loadSuggestions();
      setShowModal(false);
      setSelectedSuggestion(null);

    } catch (e) {
      console.error('Approve error:', e);
      toast('Soru eklenirken hata oluştu', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const rejectSuggestion = async (suggestionId) => {
    if (!confirm('Bu öneriyi reddetmek istediğinizden emin misiniz?')) return;

    setProcessing(true);
    try {
      await waitFirebase();
      const { db, doc, updateDoc, serverTimestamp } = window.firebase;

      await updateDoc(doc(db, 'suggestedQuestions', suggestionId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: getCurrentUser().uid
      });

      toast('Öneri reddedildi', 'success');
      loadSuggestions();
      setShowModal(false);
      setSelectedSuggestion(null);

    } catch (e) {
      console.error('Reject error:', e);
      toast('Öneri reddedilirken hata oluştu', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const deleteSuggestion = async (suggestionId) => {
    if (!confirm('Bu öneriyi kalıcı olarak silmek istediğinizden emin misiniz?')) return;

    setProcessing(true);
    try {
      await waitFirebase();
      const { db, doc, deleteDoc } = window.firebase;
      await deleteDoc(doc(db, 'suggestedQuestions', suggestionId));
      toast('Öneri silindi', 'success');
      loadSuggestions();
      setShowModal(false);
      setSelectedSuggestion(null);
    } catch (e) {
      console.error('Delete error:', e);
      toast('Öneri silinirken hata oluştu', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'pending') return <span className="chip bg-yellow-100 text-yellow-700">⏳ Bekliyor</span>;
    if (status === 'approved') return <span className="chip bg-green-100 text-green-700">✅ Onaylandı</span>;
    if (status === 'rejected') return <span className="chip bg-red-100 text-red-700">❌ Reddedildi</span>;
    return <span className="chip">{status}</span>;
  };

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  if (loading) return <Page title="Soru Önerileri"><LoadingSpinner /></Page>;

  return (
    <Page
      title="📬 Soru Önerileri"
      subtitle={`${suggestions.length} toplam öneri, ${pendingCount} bekliyor`}
    >
      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        <button className="chip chip-blue" onClick={() => loadSuggestions()}>
          Tümü ({suggestions.length})
        </button>
        <button className="chip bg-yellow-100 text-yellow-700">
          Bekleyenler ({pendingCount})
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="card p-8 text-center text-dark-500">
          Henüz soru önerisi yok.
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="card p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(suggestion.status)}
                    <span className="chip chip-blue">{typeLabel(suggestion.type)}</span>
                    <span className="chip chip-orange">{suggestion.category}</span>
                    <span className="chip bg-gray-200 text-gray-600">
                      {suggestion.difficulty === 'easy' ? 'Kolay' : suggestion.difficulty === 'medium' ? 'Orta' : 'Zor'}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-dark-900 mb-2">
                    {suggestion.questionText}
                  </h3>

                  {suggestion.questionImageUrl && (
                    <img src={suggestion.questionImageUrl} alt="Question" className="max-w-xs rounded-lg border mb-2" />
                  )}

                  {suggestion.type === 'mcq' && (
                    <div className="text-sm text-dark-600 mb-2">
                      <strong>Seçenekler:</strong> {suggestion.options.filter(o => o).join(', ')}
                      <br />
                      <strong>Doğru Cevap:</strong> <span className="text-accent-600 font-semibold">{suggestion.correctAnswer}</span>
                    </div>
                  )}

                  <div className="text-xs text-dark-500 mt-2">
                    Öneren: {suggestion.suggestedBy?.name} ({suggestion.suggestedBy?.email})
                    <br />
                    Tarih: {fmtDate(suggestion.createdAt)}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                    onClick={() => {
                      setSelectedSuggestion(suggestion);
                      setShowModal(true);
                    }}
                  >
                    👁️ Detay
                  </button>

                  {suggestion.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-sm bg-green-500 text-white hover:bg-green-600"
                        onClick={() => approveSuggestion(suggestion)}
                        disabled={processing}
                      >
                        ✅ Onayla
                      </button>
                      <button
                        className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
                        onClick={() => rejectSuggestion(suggestion.id)}
                        disabled={processing}
                      >
                        ❌ Reddet
                      </button>
                    </>
                  )}

                  <button
                    className="btn btn-sm btn-ghost text-red-600"
                    onClick={() => deleteSuggestion(suggestion.id)}
                    disabled={processing}
                  >
                    🗑️ Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedSuggestion && (
        <>
          <div className="overlay open" onClick={() => setShowModal(false)} style={{ zIndex: 998 }}></div>
          <div
            className="modal-lg open"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 999,
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark-900">Soru Detayı</h2>
              <button
                className="text-dark-400 hover:text-dark-900 text-2xl"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <strong>Durum:</strong> {getStatusBadge(selectedSuggestion.status)}
              </div>

              {/* Question */}
              <div>
                <strong>Soru:</strong>
                <p className="text-dark-700 mt-1">{selectedSuggestion.questionText}</p>
              </div>

              {/* Question Image */}
              {selectedSuggestion.questionImageUrl && (
                <div>
                  <strong>Soru Görseli:</strong>
                  <img src={selectedSuggestion.questionImageUrl} alt="Question" className="mt-2 max-w-md rounded-lg border" />
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <strong>Tip:</strong> {typeLabel(selectedSuggestion.type)}
                </div>
                <div>
                  <strong>Kategori:</strong> {selectedSuggestion.category}
                </div>
                <div>
                  <strong>Zorluk:</strong> {selectedSuggestion.difficulty === 'easy' ? 'Kolay' : selectedSuggestion.difficulty === 'medium' ? 'Orta' : 'Zor'}
                </div>
              </div>

              {/* Options */}
              {selectedSuggestion.type === 'mcq' && (
                <div>
                  <strong>Seçenekler:</strong>
                  {selectedSuggestion.hasImageOptions ? (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {selectedSuggestion.options.map((o, i) => selectedSuggestion.optionImageUrls[i] && (
                        <div key={i} className="border rounded-lg p-2">
                          <div className="font-medium text-sm mb-1">{o}</div>
                          <img src={selectedSuggestion.optionImageUrls[i]} alt={`Option ${i + 1}`} className="w-full rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="list-disc list-inside mt-2">
                      {selectedSuggestion.options.filter(o => o).map((o, i) => (
                        <li key={i} className={o === selectedSuggestion.correctAnswer ? 'text-green-600 font-semibold' : ''}>
                          {o} {o === selectedSuggestion.correctAnswer && '✓'}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2">
                    <strong>Doğru Cevap:</strong> <span className="text-green-600 font-semibold">{selectedSuggestion.correctAnswer}</span>
                  </div>
                </div>
              )}

              {/* Timer */}
              {selectedSuggestion.hasTimer && (
                <div>
                  <strong>Süre Sınırı:</strong> {selectedSuggestion.timerSeconds} saniye
                </div>
              )}

              {/* Suggester */}
              <div className="border-t pt-4">
                <strong>Öneren Kişi:</strong>
                <p className="text-sm text-dark-600 mt-1">
                  {selectedSuggestion.suggestedBy?.name}<br />
                  {selectedSuggestion.suggestedBy?.email}<br />
                  {fmtDate(selectedSuggestion.createdAt)}
                </p>
              </div>

              {/* Actions */}
              {selectedSuggestion.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    className="btn btn-primary flex-1"
                    onClick={() => approveSuggestion(selectedSuggestion)}
                    disabled={processing}
                  >
                    {processing ? 'İşleniyor...' : '✅ Onayla ve Soru Havuzuna Ekle'}
                  </button>
                  <button
                    className="btn bg-red-500 text-white hover:bg-red-600 flex-1"
                    onClick={() => rejectSuggestion(selectedSuggestion.id)}
                    disabled={processing}
                  >
                    {processing ? 'İşleniyor...' : '❌ Reddet'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  );
};

window.SuggestedQuestions = SuggestedQuestions;
