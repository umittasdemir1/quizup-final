const { useState, useEffect, useRef } = React;

const SuggestedQuestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const questionImageRef = useRef(null);
  const optionImageRefs = useRef([]);

  // Auth check - only admin
  useEffect(() => {
    if (!requireAuth('admin')) return;
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    console.log('=== LOADING SUGGESTIONS ===');
    try {
      await waitFirebase();
      const { db, collection, getDocs, query, orderBy } = window.firebase;
      console.log('Firebase ready, creating query...');

      const q = query(collection(db, 'suggestedQuestions'), orderBy('createdAt', 'desc'));
      console.log('Query created, fetching documents...');

      const snapshot = await getDocs(q);
      console.log('Snapshot received. Document count:', snapshot.size);

      const data = snapshot.docs.map(d => {
        const docData = { id: d.id, ...d.data() };
        console.log('Document:', docData);
        return docData;
      });

      console.log('Total suggestions loaded:', data.length);
      setSuggestions(data);
    } catch (e) {
      console.error('Load suggestions error:', e);
      console.error('Error details:', e.message, e.code);
      toast('Öneriler yüklenemedi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateEditField = (key, value) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
    if (editErrors[key]) {
      setEditErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const updateEditOption = (index, value) => {
    const newOptions = [...editForm.options];
    newOptions[index] = value;
    setEditForm(prev => ({ ...prev, options: newOptions }));
  };

  const uploadQuestionImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
      const storageRef = ref(storage, `questions/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateEditField('questionImageUrl', url);
      toast('Görsel yüklendi', 'success');
    } catch (e) {
      console.error('Upload error:', e);
      toast('Görsel yüklenirken hata oluştu', 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadOptionImage = async (file, index) => {
    if (!file) return;
    setUploading(true);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
      const storageRef = ref(storage, `options/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const newUrls = [...editForm.optionImageUrls];
      newUrls[index] = url;
      setEditForm(prev => ({ ...prev, optionImageUrls: newUrls }));
      toast('Seçenek görseli yüklendi', 'success');
    } catch (e) {
      console.error('Upload error:', e);
      toast('Görsel yüklenirken hata oluştu', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (suggestion) => {
    setEditForm({
      id: suggestion.id,
      questionText: suggestion.questionText,
      type: suggestion.type,
      category: suggestion.category,
      difficulty: suggestion.difficulty,
      options: suggestion.options || ['', '', '', ''],
      correctAnswer: suggestion.correctAnswer || '',
      hasTimer: suggestion.hasTimer || false,
      timerSeconds: suggestion.timerSeconds || 60,
      hasImageOptions: suggestion.hasImageOptions || false,
      optionImageUrls: suggestion.optionImageUrls || ['', '', '', ''],
      questionImageUrl: suggestion.questionImageUrl || '',
      suggestedBy: suggestion.suggestedBy
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const saveEditAndApprove = async () => {
    // Validation
    const validationErrors = validateQuestion(editForm);
    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors);
      toast('Lütfen tüm gerekli alanları doldurun', 'error');
      return;
    }

    if (!confirm('Bu soruyu düzenlenmiş haliyle soru havuzuna eklemek istediğinizden emin misiniz?')) return;

    setProcessing(true);
    try {
      await waitFirebase();
      const { db, collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } = window.firebase;

      // Add to questions collection with edited data
      const questionData = {
        questionText: editForm.questionText,
        type: editForm.type,
        category: editForm.category,
        difficulty: editForm.difficulty,
        options: editForm.options || [],
        correctAnswer: editForm.correctAnswer || '',
        hasTimer: editForm.hasTimer || false,
        timerSeconds: editForm.timerSeconds || 60,
        hasImageOptions: editForm.hasImageOptions || false,
        optionImageUrls: editForm.optionImageUrls || [],
        questionImageUrl: editForm.questionImageUrl || '',
        isActive: true,
        createdAt: serverTimestamp(),
        suggestedBy: editForm.suggestedBy
      };

      await addDoc(collection(db, 'questions'), questionData);

      // Delete suggestion (approved suggestions are removed)
      await deleteDoc(doc(db, 'suggestedQuestions', editForm.id));

      toast('Soru düzenlendi ve havuzuna eklendi!', 'success');
      loadSuggestions();
      setShowEditModal(false);
      setEditForm(null);

    } catch (e) {
      console.error('Save and approve error:', e);
      toast('Soru eklenirken hata oluştu', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const approveSuggestion = async (suggestion) => {
    if (!confirm('Bu soruyu olduğu gibi soru havuzuna eklemek istediğinizden emin misiniz?')) return;

    setProcessing(true);
    try {
      await waitFirebase();
      const { db, collection, addDoc, doc, deleteDoc, serverTimestamp } = window.firebase;

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
        isActive: true,
        createdAt: serverTimestamp(),
        suggestedBy: suggestion.suggestedBy
      };

      await addDoc(collection(db, 'questions'), questionData);

      // Delete suggestion (approved suggestions are removed)
      await deleteDoc(doc(db, 'suggestedQuestions', suggestion.id));

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
    if (!confirm('Bu öneriyi reddetmek istediğinizden emin misiniz? Öneri kalıcı olarak silinecektir.')) return;

    setProcessing(true);
    try {
      await waitFirebase();
      const { db, doc, deleteDoc } = window.firebase;

      // Reject = Delete from database
      await deleteDoc(doc(db, 'suggestedQuestions', suggestionId));

      toast('Öneri reddedildi ve silindi', 'success');
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

  const getStatusBadge = (status) => {
    if (status === 'pending') return <span className="chip bg-yellow-100 text-yellow-700 inline-flex items-center gap-1"><ClockIcon size={14} strokeWidth={2} /> Bekliyor</span>;
    if (status === 'approved') return <span className="chip bg-green-100 text-green-700 inline-flex items-center gap-1"><CheckCircleIcon size={14} strokeWidth={2} /> Onaylandı</span>;
    if (status === 'rejected') return <span className="chip bg-red-100 text-red-700 inline-flex items-center gap-1"><XCircleIcon size={14} strokeWidth={2} /> Reddedildi</span>;
    return <span className="chip">{status}</span>;
  };

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  if (loading) return <Page title="Soru Önerileri"><LoadingSpinner /></Page>;

  return (
    <Page
      title="📬 Soru Önerileri"
      subtitle={`${suggestions.length} toplam öneri, ${pendingCount} bekliyor`}
    >
      <div className="max-w-5xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-4 bg-blue-50 border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{suggestions.length}</div>
            <div className="text-sm text-blue-700">Toplam Öneri</div>
          </div>
          <div className="card p-4 bg-yellow-50 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-sm text-yellow-700">Bekleyen</div>
          </div>
          <div className="card p-4 bg-green-50 border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {suggestions.filter(s => s.status === 'approved').length}
            </div>
            <div className="text-sm text-green-700">Onaylanan</div>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div className="card p-8 text-center text-dark-500">
            <div className="text-6xl mb-4">📭</div>
            <p>Henüz soru önerisi yok.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {getStatusBadge(suggestion.status)}
                      <span className="chip chip-blue">{typeLabel(suggestion.type)}</span>
                      <span className="chip chip-orange">{suggestion.category}</span>
                      <span className="chip bg-gray-200 text-gray-600">
                        {suggestion.difficulty === 'easy' ? 'Kolay' : suggestion.difficulty === 'medium' ? 'Orta' : 'Zor'}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-dark-900 mb-3 break-words">
                      {suggestion.questionText}
                    </h3>

                    {suggestion.type === 'mcq' && (
                      <div className="text-sm text-dark-600 mb-3 bg-gray-50 p-3 rounded-lg">
                        <div className="font-semibold mb-1">Seçenekler:</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {suggestion.options.filter(o => o).map((o, i) => (
                            <span key={i} className={`px-3 py-1 rounded-full text-xs ${o === suggestion.correctAnswer ? 'bg-green-100 text-green-700 font-semibold' : 'bg-gray-200 text-gray-700'}`}>
                              {o} {o === suggestion.correctAnswer && <CheckIcon size={16} strokeWidth={2} />}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-dark-500 mt-3">
                      <div>
                        <span className="font-semibold">Öneren:</span> {suggestion.suggestedBy?.name}
                        {suggestion.suggestedBy?.isAnonymous && <span className="text-yellow-600"> (Anonim)</span>}
                      </div>
                      <div>
                        <span className="font-semibold">Tarih:</span> {fmtDate(suggestion.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {suggestion.status === 'pending' && (
                    <div className="flex lg:flex-col gap-2 flex-wrap">
                      <button
                        className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2"
                        onClick={() => {
                          setSelectedSuggestion(suggestion);
                          setShowModal(true);
                        }}
                      >
                        <EyeIcon size={18} strokeWidth={2} />
                        <span>Detay</span>
                      </button>
                      <button
                        className="btn btn-sm bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-2"
                        onClick={() => openEditModal(suggestion)}
                        disabled={processing}
                      >
                        <PencilSquareIcon size={18} strokeWidth={2} />
                        <span>Düzenle</span>
                      </button>
                      <button
                        className="btn btn-sm bg-green-500 text-white hover:bg-green-600 flex items-center gap-2"
                        onClick={() => approveSuggestion(suggestion)}
                        disabled={processing}
                      >
                        <CheckCircleIcon size={18} strokeWidth={2} />
                        <span>Onayla</span>
                      </button>
                      <button
                        className="btn btn-sm bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
                        onClick={() => rejectSuggestion(suggestion.id)}
                        disabled={processing}
                      >
                        <XCircleIcon size={18} strokeWidth={2} />
                        <span>Reddet</span>
                      </button>
                    </div>
                  )}
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
                            {o} {o === selectedSuggestion.correctAnswer && <CheckIcon size={16} strokeWidth={2} />}
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
                    {selectedSuggestion.suggestedBy?.name}
                    {selectedSuggestion.suggestedBy?.isAnonymous && <span className="text-yellow-600"> (Anonim Kullanıcı)</span>}
                    <br />
                    {selectedSuggestion.suggestedBy?.email && `${selectedSuggestion.suggestedBy?.email}`}
                    <br />
                    {fmtDate(selectedSuggestion.createdAt)}
                  </p>
                </div>

                {/* Actions */}
                {selectedSuggestion.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      className="btn bg-purple-500 text-white hover:bg-purple-600 flex-1"
                      onClick={() => {
                        setShowModal(false);
                        openEditModal(selectedSuggestion);
                      }}
                      disabled={processing}
                    >
                      <PencilSquareIcon size={18} strokeWidth={2} className="inline" /> Düzenle ve Onayla
                    </button>
                    <button
                      className="btn btn-primary flex-1"
                      onClick={() => approveSuggestion(selectedSuggestion)}
                      disabled={processing}
                    >
                      {processing ? 'İşleniyor...' : <><CheckCircleIcon size={18} strokeWidth={2} /> Olduğu Gibi Onayla</>}
                    </button>
                    <button
                      className="btn bg-red-500 text-white hover:bg-red-600 flex-1"
                      onClick={() => rejectSuggestion(selectedSuggestion.id)}
                      disabled={processing}
                    >
                      {processing ? 'İşleniyor...' : <><XCircleIcon size={18} strokeWidth={2} /> Reddet</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Edit Modal */}
        {showEditModal && editForm && (
          <>
            <div className="overlay open" onClick={() => setShowEditModal(false)} style={{ zIndex: 998 }}></div>
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
                maxWidth: '900px',
                width: '95%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
                  <PencilSquareIcon size={24} strokeWidth={2} /> Soruyu Düzenle
                </h2>
                <button
                  className="text-dark-400 hover:text-dark-900 text-2xl"
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>

              {/* Edit Form - Matching AdminForm */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-dark-700">Soru Metni *</label>
                  <textarea
                    className={`field min-h-[100px] ${editErrors.questionText ? 'error' : ''}`}
                    value={editForm.questionText}
                    onChange={e => updateEditField('questionText', e.target.value)}
                    placeholder="Soru metnini giriniz..."
                  ></textarea>
                  {editErrors.questionText && <div className="error-text">{editErrors.questionText}</div>}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-dark-700">Tip *</label>
                    <select className={`field ${editErrors.type ? 'error' : ''}`} value={editForm.type} onChange={e => updateEditField('type', e.target.value)}>
                      <option value="mcq">Çoktan Seçmeli</option>
                      <option value="open">Klasik (Serbest Yanıt)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-dark-700">Kategori *</label>
                    <input
                      className={`field ${editErrors.category ? 'error' : ''}`}
                      value={editForm.category}
                      onChange={e => updateEditField('category', e.target.value)}
                      placeholder="Ürün Bilgisi"
                    />
                    {editErrors.category && <div className="error-text">{editErrors.category}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-dark-700">Zorluk *</label>
                    <select className={`field ${editErrors.difficulty ? 'error' : ''}`} value={editForm.difficulty} onChange={e => updateEditField('difficulty', e.target.value)}>
                      <option value="easy">Kolay</option>
                      <option value="medium">Orta</option>
                      <option value="hard">Zor</option>
                    </select>
                  </div>
                </div>

                {editForm.type === 'mcq' && (
                  <>
                    {!editForm.hasImageOptions && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-dark-700">Seçenekler * (En az 2)</label>
                          <div className="space-y-2">
                            {editForm.options.map((o, i) => (
                              <input
                                key={i}
                                className={`field ${editErrors.options ? 'error' : ''}`}
                                value={o}
                                onChange={e => updateEditOption(i, e.target.value)}
                                placeholder={`Seçenek ${i + 1}`}
                              />
                            ))}
                          </div>
                          {editErrors.options && <div className="error-text">{editErrors.options}</div>}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-dark-700">Doğru Cevap *</label>
                          <select className={`field ${editErrors.correctAnswer ? 'error' : ''}`} value={editForm.correctAnswer} onChange={e => updateEditField('correctAnswer', e.target.value)}>
                            <option value="">Seçiniz</option>
                            {editForm.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                          </select>
                          {editErrors.correctAnswer && <div className="error-text">{editErrors.correctAnswer}</div>}
                        </div>
                      </>
                    )}

                    {editForm.hasImageOptions && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-dark-700">Seçenek İsimleri * (Kısa etiketler)</label>
                          <p className="text-xs text-dark-500 mb-2">Her görsel için kısa bir isim verin (örn: "A", "B", "C" veya "Seçenek 1")</p>
                          <div className="grid grid-cols-2 gap-2">
                            {editForm.options.map((o, i) => (
                              <input
                                key={i}
                                className="field"
                                value={o}
                                onChange={e => updateEditOption(i, e.target.value)}
                                placeholder={`Etiket ${i + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2 text-dark-700">Doğru Cevap *</label>
                          <select className={`field ${editErrors.correctAnswer ? 'error' : ''}`} value={editForm.correctAnswer} onChange={e => updateEditField('correctAnswer', e.target.value)}>
                            <option value="">Seçiniz</option>
                            {editForm.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                          </select>
                          {editErrors.correctAnswer && <div className="error-text">{editErrors.correctAnswer}</div>}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* TIMER SECTION */}
                <div className="card p-4 bg-secondary-50 border border-secondary-200">
                  <div className="flex items-center gap-3 mb-3">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={editForm.hasTimer}
                        onChange={e => updateEditField('hasTimer', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="font-semibold text-dark-900 flex items-center gap-2"><ClockIcon size={18} strokeWidth={2} /> Süre Sınırı Ekle</span>
                  </div>

                  {editForm.hasTimer && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-dark-700">Süre (saniye)</label>
                      <input
                        type="number"
                        className="field"
                        value={editForm.timerSeconds}
                        onChange={e => updateEditField('timerSeconds', e.target.value)}
                        placeholder="60"
                        min="10"
                        max="300"
                      />
                      <p className="text-xs text-dark-500 mt-1">Önerilen: 30-120 saniye arası</p>
                    </div>
                  )}
                </div>

                {/* IMAGE SECTION */}
                <div className="card p-4 bg-primary-50 border border-primary-200">
                  <h4 className="font-bold text-dark-900 mb-3">📸 Görsel Ekle</h4>

                  {/* Question Image */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-dark-700">Soru Görseli</label>
                      {editForm.questionImageUrl && (
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                          onClick={() => updateEditField('questionImageUrl', '')}
                        >
                          <XMarkIcon size={14} strokeWidth={2} /> Kaldır
                        </button>
                      )}
                    </div>
                    {editForm.questionImageUrl ? (
                      <div className="question-image-container max-w-md mx-auto">
                        <img src={editForm.questionImageUrl} alt="Soru" />
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost w-full"
                          onClick={() => questionImageRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? 'Yükleniyor...' : '📤 Görsel Yükle'}
                        </button>
                        <input
                          ref={questionImageRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => uploadQuestionImage(e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </>
                    )}
                  </div>

                  {/* Option Images */}
                  {editForm.type === 'mcq' && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={editForm.hasImageOptions}
                            onChange={e => updateEditField('hasImageOptions', e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                        <span className="text-sm font-semibold text-dark-700">Seçeneklerde Görsel Kullan</span>
                      </div>

                      {editForm.hasImageOptions && (
                        <div className="grid grid-cols-2 gap-3">
                          {editForm.options.map((o, i) => o.trim() && (
                            <div key={i} className="space-y-2">
                              <label className="text-xs font-semibold text-dark-700">Seçenek {i + 1}</label>
                              {editForm.optionImageUrls[i] ? (
                                <div className="relative">
                                  <div className="question-image-container">
                                    <img
                                      src={editForm.optionImageUrls[i]}
                                      alt={`Seçenek ${i + 1}`}
                                      className="w-full aspect-square object-cover rounded-lg"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                                    onClick={() => {
                                      const newUrls = [...editForm.optionImageUrls];
                                      newUrls[i] = '';
                                      updateEditField('optionImageUrls', newUrls);
                                    }}
                                  >
                                    <XMarkIcon size={14} strokeWidth={2} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-ghost w-full text-xs py-2"
                                    onClick={() => optionImageRefs.current[i]?.click()}
                                    disabled={uploading}
                                  >
                                    📤 Yükle
                                  </button>
                                  <input
                                    ref={el => optionImageRefs.current[i] = el}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => uploadOptionImage(e.target.files[0], i)}
                                    style={{ display: 'none' }}
                                  />
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    className="btn btn-ghost flex-1"
                    onClick={() => setShowEditModal(false)}
                    disabled={processing}
                  >
                    İptal
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={saveEditAndApprove}
                    disabled={processing || uploading}
                  >
                    {processing ? 'Kaydediliyor...' : <><CheckCircleIcon size={18} strokeWidth={2} /> Kaydet ve Onayla</>}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Page>
  );
};

window.SuggestedQuestions = SuggestedQuestions;
