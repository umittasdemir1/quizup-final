const { useState, useEffect, useRef } = React;

const Manager = () => {
  const [sessions, setSessions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employee: { fullName: '', store: '' }, questionIds: [] });
  const [errors, setErrors] = useState({});
  const [qrUrl, setQrUrl] = useState('');
  const qrRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
  });
  const filterRef = useRef(null);

  useEffect(() => {
    (async () => {
      await waitFirebase();
      const { db, collection, query, orderBy, onSnapshot, where } = window.firebase;
      
      const qSessions = query(collection(db, 'quizSessions'), orderBy('createdAt', 'desc'));
      const unsubSessions = onSnapshot(qSessions, snap => {
        setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        console.error('Error loading sessions:', error);
        toast('Oturumlar yüklenirken hata oluştu', 'error');
      });
      
      const qQuestions = query(collection(db, 'questions'), where('isActive', '==', true));
      const unsubQuestions = onSnapshot(qQuestions, snap => {
        setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (error) => {
        console.error('Error loading questions:', error);
        toast('Sorular yüklenirken hata oluştu', 'error');
        setLoading(false);
      });
      
      return () => {
        unsubSessions();
        unsubQuestions();
      };
    })();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique categories from questions
  const uniqueCategories = [...new Set(questions.map(q => q.category).filter(Boolean))].sort();
  const difficulties = [
    { value: 'easy', label: 'Kolay' },
    { value: 'medium', label: 'Orta' },
    { value: 'hard', label: 'Zor' }
  ];

  // Toggle filter selection
  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ categories: [], difficulties: [] });
  };

  // Apply filters to questions
  const filteredQuestions = questions.filter(q => {
    // Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(q.category)) {
      return false;
    }
    // Difficulty filter
    if (filters.difficulties.length > 0 && !filters.difficulties.includes(q.difficulty)) {
      return false;
    }
    return true;
  });

  // Count active filters
  const activeFilterCount = filters.categories.length + filters.difficulties.length;

  const reset = () => {
    setForm({ employee: { fullName: '', store: '' }, questionIds: [] });
    setShowForm(false);
    setQrUrl('');
    setErrors({});
    setFilters({ categories: [], difficulties: [] });
  };

  const toggleQ = (id) => {
    const ids = [...form.questionIds];
    const idx = ids.indexOf(id);
    if (idx > -1) ids.splice(idx, 1);
    else ids.push(id);
    setForm(f => ({ ...f, questionIds: ids }));
    if (errors.questions) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors.questions;
        return newErrors;
      });
    }
  };

  const selectAllQuestions = () => {
    // Select all filtered questions, not all questions
    setForm(f => ({ ...f, questionIds: filteredQuestions.map(q => q.id) }));
    if (errors.questions) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors.questions;
        return newErrors;
      });
    }
  };

  const clearAllQuestions = () => {
    setForm(f => ({ ...f, questionIds: [] }));
  };

  const handleCreate = async () => {
    const validationErrors = validateSession(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast('Lütfen tüm zorunlu alanları doldurun', 'error');
      return;
    }

    setSaving(true);
    try {
      await waitFirebase();
      const { db, collection, addDoc, serverTimestamp } = window.firebase;
      const data = {
        employee: {
          fullName: form.employee.fullName.trim(),
          store: form.employee.store.trim()
        },
        questionIds: form.questionIds,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'quizSessions'), data);
      const url = location.origin + location.pathname + '#/quiz/' + ref.id;
      setQrUrl(url);
      
      setTimeout(() => {
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
          new QRCode(qrRef.current, { text: url, width: 200, height: 200 });
        }
      }, 100);
      
      toast('Quiz oturumu oluşturuldu', 'success');
    } catch(e) {
      console.error('Create session error:', e);
      toast('Oturum oluşturulurken hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu oturumu silmek istediğinizden emin misiniz?\n\nİlgili tüm test sonuçları da silinecektir.')) return;
    
    try {
      await waitFirebase();
      const { db, doc, deleteDoc, collection, query, where, getDocs } = window.firebase;
      
      // First, delete all results associated with this session
      const resultsQuery = query(collection(db, 'results'), where('sessionId', '==', id));
      const resultsSnapshot = await getDocs(resultsQuery);
      
      const deletePromises = resultsSnapshot.docs.map(resultDoc => 
        deleteDoc(doc(db, 'results', resultDoc.id))
      );
      
      await Promise.all(deletePromises);
      
      // Then delete the session itself
      await deleteDoc(doc(db, 'quizSessions', id));
      
      const deletedCount = resultsSnapshot.size;
      if (deletedCount > 0) {
        toast(`Oturum ve ${deletedCount} test sonucu silindi`, 'success');
      } else {
        toast('Oturum silindi', 'success');
      }
    } catch(e) {
      console.error('Delete session error:', e);
      toast('Oturum silinirken hata oluştu: ' + e.message, 'error');
    }
  };

  const updateEmployee = (k, v) => {
    setForm(f => ({ ...f, employee: { ...f.employee, [k]: v } }));
    if (errors[k]) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors[k];
        return newErrors;
      });
    }
  };

  if (loading) return <Page title="Manager Panel"><LoadingSpinner text="Veriler yükleniyor..." /></Page>;

  return (
    <Page 
      title="Manager Panel" 
      subtitle={`${sessions.length} oturum • ${questions.length} aktif soru`}
      extra={!showForm && !qrUrl && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Yeni Quiz Ata</button>}
    >
      {qrUrl ? (
        <div className="card p-8 text-center space-y-6">
          <div className="inline-block p-6 bg-white rounded-2xl shadow-card">
            <div ref={qrRef}></div>
          </div>
          <div>
            <p className="font-semibold text-lg text-dark-900 mb-2">Quiz Hazır!</p>
            <p className="text-sm text-dark-600 mb-4">Personel bu QR kodu okutarak quize başlayabilir</p>
            <a href={qrUrl} target="_blank" className="text-primary-500 text-sm hover:underline break-all">{qrUrl}</a>
          </div>
          <button className="btn btn-primary" onClick={reset}>Yeni Quiz Oluştur</button>
        </div>
      ) : showForm ? (
        <div className="card p-6 space-y-6">
          <h3 className="text-xl font-bold text-dark-900">Yeni Quiz Oturumu</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Personel Adı *</label>
              <input 
                className={`field ${errors.fullName ? 'error' : ''}`}
                value={form.employee.fullName} 
                onChange={e => updateEmployee('fullName', e.target.value)}
                placeholder="Ümit TAŞDEMİR"
              />
              {errors.fullName && <div className="error-text">{errors.fullName}</div>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Mağaza *</label>
              <input 
                className={`field ${errors.store ? 'error' : ''}`}
                value={form.employee.store} 
                onChange={e => updateEmployee('store', e.target.value)}
                placeholder="Midtown"
              />
              {errors.store && <div className="error-text">{errors.store}</div>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-dark-700">
                Sorular Seç * ({form.questionIds.length} soru seçildi)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost text-xs px-3 py-1.5"
                  onClick={selectAllQuestions}
                  disabled={filteredQuestions.length === 0}
                >
                  ✓ Tümünü Seç
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs px-3 py-1.5"
                  onClick={clearAllQuestions}
                  disabled={form.questionIds.length === 0}
                >
                  ✕ Tümünü Kaldır
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs text-dark-600">
                {filteredQuestions.length} / {questions.length} soru gösteriliyor
              </div>

              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  🔍 Filtrele
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-primary-500 rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter Dropdown */}
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4" style={{ animation: 'fadeIn 0.2s ease-in' }}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-dark-900 text-sm">Filtreler</h3>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          className="text-xs text-primary-500 hover:text-primary-600 font-semibold"
                          onClick={clearFilters}
                        >
                          Temizle
                        </button>
                      )}
                    </div>

                    {/* Category Filter */}
                    {uniqueCategories.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-dark-700 mb-2">📁 Kategori</h4>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {uniqueCategories.map(cat => (
                            <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={filters.categories.includes(cat)}
                                onChange={() => toggleFilter('categories', cat)}
                                className="w-3.5 h-3.5 text-primary-500 rounded"
                              />
                              <span className="text-xs text-dark-800">{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Difficulty Filter */}
                    <div>
                      <h4 className="text-xs font-semibold text-dark-700 mb-2">⚡ Zorluk</h4>
                      <div className="space-y-1.5">
                        {difficulties.map(diff => (
                          <label key={diff.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.difficulties.includes(diff.value)}
                              onChange={() => toggleFilter('difficulties', diff.value)}
                              className="w-3.5 h-3.5 text-primary-500 rounded"
                            />
                            <span className="text-xs text-dark-800">{diff.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {errors.questions && <div className="error-text mb-2">{errors.questions}</div>}
            <div className="grid gap-3 max-h-96 overflow-y-auto p-2">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-dark-500">
                  <p className="text-sm mb-2">
                    {questions.length === 0 ? 'Aktif soru bulunmuyor' : 'Filtreye uygun soru bulunamadı'}
                  </p>
                  {questions.length === 0 ? (
                    <a href="#/admin" className="btn btn-secondary mt-4">Soru Ekle</a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary text-xs px-3 py-1.5 mt-2"
                      onClick={clearFilters}
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              ) : (
                filteredQuestions.map(q => (
                  <label key={q.id} className={'option-card ' + (form.questionIds.includes(q.id) ? 'selected' : '')} style={{ cursor: 'pointer' }}>
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        checked={form.questionIds.includes(q.id)} 
                        onChange={() => toggleQ(q.id)}
                        className="mt-1 w-5 h-5 flex-shrink-0"
                        style={{ cursor: 'pointer' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="chip chip-blue text-xs">{typeLabel(q.type)}</span>
                          <span className="chip chip-orange text-xs">{q.category}</span>
                        </div>
                        <p className="text-sm font-medium text-dark-900 break-words">{q.questionText}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Oluşturuluyor...' : 'Oluştur & QR Göster'}
            </button>
            <button className="btn btn-ghost" onClick={reset} disabled={saving}>İptal</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-dark-500 text-lg">Henüz quiz oturumu oluşturulmamış</p>
              <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>İlk Oturumu Oluştur</button>
            </div>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="card p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`chip ${s.status === 'completed' ? 'chip-green' : 'chip-orange'}`}>
                        {s.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </span>
                    </div>
                    <p className="font-semibold text-lg text-dark-900 break-words">{s.employee?.fullName || '-'}</p>
                    <p className="text-sm text-dark-600 break-words">{s.employee?.store || '-'}</p>
                    <p className="text-xs text-dark-400 mt-2">
                      {(s.questionIds || []).length} soru • {fmtDate(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a href={'#/quiz/' + s.id} className="btn btn-secondary text-sm px-3 py-2" target="_blank">🔗 Aç</a>
                    <button className="btn btn-danger text-sm px-3 py-2" onClick={() => handleDelete(s.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Page>
  );
};

window.Manager = Manager;
