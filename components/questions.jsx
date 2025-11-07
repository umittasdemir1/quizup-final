const { useState, useEffect, useMemo, useRef } = React;

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    statuses: [],
    types: []
  });
  const filterRef = useRef(null);

  useEffect(() => {
    let unsubscribe = null;

    (async () => {
      try {
        await waitFirebase();
        const { db, collection, query, orderBy, onSnapshot } = window.firebase;
        const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
        unsubscribe = onSnapshot(q, snapshot => {
          const ordered = snapshot.docs.map((doc, index) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              order: typeof data.order === 'number' ? data.order : null,
              __originalIndex: index
            };
          }).sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : a.__originalIndex;
            const orderB = typeof b.order === 'number' ? b.order : b.__originalIndex;
            return orderA - orderB;
          }).map(({ __originalIndex, ...rest }) => rest);

          setQuestions(ordered);
          setLoading(false);
        }, error => {
          console.error('Questions load error:', error);
          toast('Sorular yüklenirken hata oluştu', 'error');
          setLoading(false);
        });
      } catch (error) {
        console.error('Questions init error:', error);
        toast('Sorular yüklenirken hata oluştu', 'error');
        setLoading(false);
      }
    })();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showFilters) return;

      if (event.target.closest('[data-question-filter-toggle]')) {
        return;
      }

      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  const uniqueCategories = useMemo(() => {
    return [...new Set(questions.map(q => q.category).filter(Boolean))].sort();
  }, [questions]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(questions.map(q => q.type).filter(Boolean))];
  }, [questions]);

  const difficulties = useMemo(() => ([
    { value: 'easy', label: 'Kolay' },
    { value: 'medium', label: 'Orta' },
    { value: 'hard', label: 'Zor' }
  ]), []);

  const stats = useMemo(() => {
    return questions.reduce((acc, q) => {
      if (q.isActive) acc.active += 1; else acc.inactive += 1;
      if (q.hasTimer) acc.timed += 1;
      return acc;
    }, { active: 0, inactive: 0, timed: 0 });
  }, [questions]);

  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  const clearFilters = () => {
    setFilters({ categories: [], difficulties: [], statuses: [], types: [] });
  };

  const resetAll = () => {
    setSearch('');
    clearFilters();
  };

  const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.statuses.length + filters.types.length;

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter(q => {
      if (filters.categories.length > 0 && (!q.category || !filters.categories.includes(q.category))) {
        return false;
      }

      if (filters.difficulties.length > 0 && (!q.difficulty || !filters.difficulties.includes(q.difficulty))) {
        return false;
      }

      if (filters.statuses.length > 0) {
        const status = q.isActive ? 'active' : 'inactive';
        if (!filters.statuses.includes(status)) {
          return false;
        }
      }

      if (filters.types.length > 0 && (!q.type || !filters.types.includes(q.type))) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        q.questionText,
        q.category,
        q.correctAnswer,
        ...(Array.isArray(q.options) ? q.options : [])
      ].filter(Boolean).map(item => String(item).toLowerCase());

      return haystack.some(text => text.includes(term));
    });
  }, [questions, search, filters]);

  if (loading) {
    return (
      <Page title="Sorular">
        <LoadingSpinner text="Sorular yükleniyor..." />
      </Page>
    );
  }

  return (
    <Page
      title="Sorular"
      subtitle={`${filteredQuestions.length} / ${questions.length} soru gösteriliyor`}
      extra={(
        <div className="text-right text-sm text-dark-500 leading-5">
          <div>Aktif: <strong className="text-dark-800">{stats.active}</strong></div>
          <div>Pasif: <strong className="text-dark-800">{stats.inactive}</strong></div>
          <div>Zamanlayıcılı: <strong className="text-dark-800">{stats.timed}</strong></div>
        </div>
      )}
    >
      <div className="card p-4 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 w-full">
            <span className="question-search-icon">🔍</span>
            <input
              type="search"
              className="field w-full pl-10"
              placeholder="Soru, kategori ya da doğru cevap ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              className="btn btn-secondary px-4 py-2 text-sm flex items-center gap-2"
              onClick={() => setShowFilters(v => !v)}
              data-question-filter-toggle="true"
            >
              🧰 Filtreler
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-500 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {(search.trim() || activeFilterCount > 0) && (
              <button
                type="button"
                className="btn btn-ghost px-3 py-2 text-sm"
                onClick={resetAll}
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="question-filter-panel" ref={filterRef}>
            <div className="grid gap-6 md:grid-cols-2">
              {uniqueCategories.length > 0 && (
                <div>
                  <h3 className="question-filter-title">📁 Kategoriler</h3>
                  <div className="question-filter-options">
                    {uniqueCategories.map(category => (
                      <label key={category} className="question-filter-option">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(category)}
                          onChange={() => toggleFilter('categories', category)}
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="question-filter-title">⚡ Zorluk</h3>
                <div className="question-filter-options">
                  {difficulties.map(diff => (
                    <label key={diff.value} className="question-filter-option">
                      <input
                        type="checkbox"
                        checked={filters.difficulties.includes(diff.value)}
                        onChange={() => toggleFilter('difficulties', diff.value)}
                      />
                      <span>{diff.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="question-filter-title">📌 Durum</h3>
                <div className="question-filter-options">
                  <label className="question-filter-option">
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes('active')}
                      onChange={() => toggleFilter('statuses', 'active')}
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="question-filter-option">
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes('inactive')}
                      onChange={() => toggleFilter('statuses', 'inactive')}
                    />
                    <span>Pasif</span>
                  </label>
                </div>
              </div>

              {uniqueTypes.length > 0 && (
                <div>
                  <h3 className="question-filter-title">🧠 Soru Tipi</h3>
                  <div className="question-filter-options">
                    {uniqueTypes.map(type => (
                      <label key={type} className="question-filter-option">
                        <input
                          type="checkbox"
                          checked={filters.types.includes(type)}
                          onChange={() => toggleFilter('types', type)}
                        />
                        <span>{typeLabel(type)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="card p-10 text-center text-dark-500">
          <div className="text-5xl mb-4">🔎</div>
          <p>Filtrelere uygun soru bulunamadı.</p>
          {(search.trim() || activeFilterCount > 0) && (
            <button type="button" className="btn btn-secondary mt-4" onClick={resetAll}>
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredQuestions.map(q => (
            <div key={q.id} className="card p-6 question-bank-card">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {q.type && <span className="chip chip-blue">{typeLabel(q.type)}</span>}
                  {q.category && <span className="chip chip-orange">{q.category}</span>}
                  {q.difficulty && (
                    <span className="chip bg-gray-200 text-gray-600">
                      {q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : 'Zor'}
                    </span>
                  )}
                  <span className={`chip ${q.isActive ? 'chip-green' : 'chip-orange'}`}>
                    {q.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  {q.hasTimer && q.timerSeconds > 0 && (
                    <span className="chip chip-blue">
                      ⏱️ {q.timerSeconds} sn
                    </span>
                  )}
                </div>

                {q.questionImageUrl && (
                  <div className="question-bank-image">
                    <img src={q.questionImageUrl} alt="Soru görseli" loading="lazy" />
                  </div>
                )}

                <h2 className="text-xl font-semibold text-dark-900">{q.questionText}</h2>

                {q.type === 'mcq' ? (
                  <ul className="question-bank-options">
                    {(q.options || []).filter(Boolean).map((option, index) => {
                      const isCorrect = q.correctAnswer && q.correctAnswer === option;
                      const imageUrl = q.hasImageOptions && Array.isArray(q.optionImageUrls)
                        ? q.optionImageUrls[index]
                        : null;
                      return (
                        <li key={index} className={`question-bank-option ${isCorrect ? 'correct' : ''}`}>
                          <div className="question-bank-option-header">
                            <span className="option-index">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{option}</span>
                            {isCorrect && <span className="option-correct">✓ Doğru</span>}
                          </div>
                          {imageUrl && (
                            <div className="option-image">
                              <img src={imageUrl} alt={`Seçenek ${index + 1}`} loading="lazy" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  q.correctAnswer ? (
                    <div className="question-bank-answer">
                      <span className="option-index">✓</span>
                      <div>
                        <div className="option-label">Beklenen Yanıt</div>
                        <div className="option-text">{q.correctAnswer}</div>
                      </div>
                    </div>
                  ) : null
                )}

                <div className="question-bank-meta">
                  <span>Oluşturulma: <strong>{fmtDate(q.createdAt)}</strong></span>
                  <span>Güncelleme: <strong>{fmtDate(q.updatedAt || q.createdAt)}</strong></span>
                  <span>ID: <code>{q.id}</code></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
};

window.QuestionBank = QuestionBank;
