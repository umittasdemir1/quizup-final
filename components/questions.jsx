const { useState, useEffect, useMemo, useRef } = React;

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    statuses: [],
    types: [],
    timers: []
  });
  const [sortOption, setSortOption] = useState('order-asc');
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const animatedPlaceholder = useAnimatedPlaceholder();

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
      if (event.target.closest('[data-question-filter-toggle]')) return;
      if (event.target.closest('[data-question-sort-toggle]')) return;

      if (showFilters && filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }

      if (showSort && sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSort(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, showSort]);

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
    setFilters({ categories: [], difficulties: [], statuses: [], types: [], timers: [] });
  };

  const resetAll = () => {
    setSearch('');
    clearFilters();
    setShowFilters(false);
  };

  const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.statuses.length + filters.types.length + filters.timers.length;

  const sortOptions = useMemo(() => ([
    { value: 'order-asc', label: 'Numara (Artan)' },
    { value: 'order-desc', label: 'Numara (Azalan)' },
    { value: 'text-asc', label: 'Soru Metni (A → Z)' },
    { value: 'text-desc', label: 'Soru Metni (Z → A)' },
    { value: 'created-desc', label: 'Oluşturulma (Yeni → Eski)' },
    { value: 'created-asc', label: 'Oluşturulma (Eski → Yeni)' },
    { value: 'difficulty-easy', label: 'Zorluk (Kolay → Zor)' },
    { value: 'difficulty-hard', label: 'Zorluk (Zor → Kolay)' },
    { value: 'category-asc', label: 'Kategori (A → Z)' },
    { value: 'category-desc', label: 'Kategori (Z → A)' }
  ]), []);

  const getDisplayOrder = (question, index) => (
    typeof question.order === 'number' ? question.order + 1 : index + 1
  );

  const toMillis = (ts) => {
    try {
      if (!ts) return 0;
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (typeof ts.toDate === 'function') return ts.toDate().getTime();
      if (typeof ts === 'number') return ts;
      if (ts.seconds) return (ts.seconds * 1000) + Math.round((ts.nanoseconds || 0) / 1e6);
      return new Date(ts).getTime() || 0;
    } catch (error) {
      return 0;
    }
  };

  const visibleQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const wantsTimed = filters.timers.includes('timed');
    const wantsUntimed = filters.timers.includes('untimed');

    const base = questions.map((q, index) => ({
      data: q,
      originalIndex: index,
      orderNumber: getDisplayOrder(q, index)
    }));

    const filtered = base.filter(({ data }) => {
      if (filters.categories.length > 0 && (!data.category || !filters.categories.includes(data.category))) {
        return false;
      }

      if (filters.difficulties.length > 0 && (!data.difficulty || !filters.difficulties.includes(data.difficulty))) {
        return false;
      }

      if (filters.statuses.length > 0) {
        const status = data.isActive ? 'active' : 'inactive';
        if (!filters.statuses.includes(status)) {
          return false;
        }
      }

      if (filters.types.length > 0 && (!data.type || !filters.types.includes(data.type))) {
        return false;
      }

      if (filters.timers.length > 0) {
        const isTimed = Boolean(data.hasTimer && Number(data.timerSeconds) > 0);
        if (wantsTimed && wantsUntimed) {
          // show all
        } else if (wantsTimed && !isTimed) {
          return false;
        } else if (wantsUntimed && isTimed) {
          return false;
        }
      }

      if (!term) {
        return true;
      }

      const haystack = [
        data.questionText,
        data.category,
        data.correctAnswer,
        ...(Array.isArray(data.options) ? data.options : [])
      ].filter(Boolean).map(item => String(item).toLowerCase());

      return haystack.some(text => text.includes(term));
    });

    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'order-desc':
          return b.orderNumber - a.orderNumber || a.originalIndex - b.originalIndex;
        case 'text-asc':
          return (a.data.questionText || '').localeCompare(b.data.questionText || '') || (a.orderNumber - b.orderNumber);
        case 'text-desc':
          return (b.data.questionText || '').localeCompare(a.data.questionText || '') || (a.orderNumber - b.orderNumber);
        case 'created-desc':
          return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
        case 'created-asc':
          return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
        case 'difficulty-easy':
          return (difficultyOrder[a.data.difficulty] || 2) - (difficultyOrder[b.data.difficulty] || 2) || (a.orderNumber - b.orderNumber);
        case 'difficulty-hard':
          return (difficultyOrder[b.data.difficulty] || 2) - (difficultyOrder[a.data.difficulty] || 2) || (a.orderNumber - b.orderNumber);
        case 'category-asc':
          return (a.data.category || '').localeCompare(b.data.category || '') || (a.orderNumber - b.orderNumber);
        case 'category-desc':
          return (b.data.category || '').localeCompare(a.data.category || '') || (a.orderNumber - b.orderNumber);
        case 'order-asc':
        default:
          return a.orderNumber - b.orderNumber || a.originalIndex - b.originalIndex;
      }
    });

    return sorted;
  }, [questions, search, filters, sortOption]);

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
      subtitle={`${visibleQuestions.length} / ${questions.length} soru gösteriliyor`}
      extra={(
        <div className="text-right text-sm text-dark-500 leading-5">
          <div>Aktif: <strong className="text-dark-800">{stats.active}</strong></div>
          <div>Pasif: <strong className="text-dark-800">{stats.inactive}</strong></div>
          <div>Zamanlayıcılı: <strong className="text-dark-800">{stats.timed}</strong></div>
        </div>
      )}
    >
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3">
          {/* Search Bar - Oval Design */}
          <div className="relative flex-1">
            <span className="question-search-icon"><MagnifyingGlassIcon size={18} strokeWidth={2} /></span>
            <input
              type="search"
              className="w-full pl-10 pr-4 py-3 border rounded-full bg-white body-medium focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
              placeholder={animatedPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                borderColor: '#E0E0E0'
              }}
            />
          </div>

          {/* Sort Button - Circular */}
          <div className="relative" ref={sortRef} title="Sırala">
            <button
              type="button"
              className="p-3 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative"
              onClick={() => setShowSort(v => !v)}
              data-question-sort-toggle="true"
              style={{ borderColor: '#E0E0E0' }}
            >
              <BarsArrowUpIcon size={20} strokeWidth={2} />
            </button>
            {showSort && (
              <div className="question-filter-panel">
                <h3 className="title-small mb-3">Sırala</h3>
                <div className="flex flex-col gap-2">
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`px-4 py-2 text-left rounded-lg transition-all ${
                        sortOption === option.value
                          ? 'bg-primary-500 text-white font-semibold'
                          : 'bg-gray-50 hover:bg-gray-100 text-dark-700'
                      }`}
                      onClick={() => {
                        setSortOption(option.value);
                        setShowSort(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Button - Circular */}
          <div className="relative" ref={filterRef} title="Filtrele">
            <button
              type="button"
              className="p-3 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative"
              onClick={() => setShowFilters(v => !v)}
              data-question-filter-toggle="true"
              style={{ borderColor: '#E0E0E0' }}
            >
              <FunnelIcon size={20} strokeWidth={2} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs label-small text-white bg-primary-500 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
              {showFilters && (
                <div className="question-filter-panel">
                  <div className="grid gap-6 md:grid-cols-2">
                    {uniqueCategories.length > 0 && (
                      <div>
                        <h3 className="title-small">Kategoriler</h3>
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
                      <h3 className="title-small">Zorluk</h3>
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
                      <h3 className="title-small">Durum</h3>
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
                        <h3 className="title-small">Soru Tipi</h3>
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

                    <div>
                      <h3 className="title-small">Süre</h3>
                      <div className="question-filter-options">
                        <label className="question-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.timers.includes('timed')}
                            onChange={() => toggleFilter('timers', 'timed')}
                          />
                          <span>Süreli</span>
                        </label>
                        <label className="question-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.timers.includes('untimed')}
                            onChange={() => toggleFilter('timers', 'untimed')}
                          />
                          <span>Süresiz</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  {(activeFilterCount > 0 || search.trim()) && (
                    <div className="flex justify-end mt-4">
                      <button type="button" className="btn btn-ghost text-sm" onClick={resetAll}>Temizle</button>
                    </div>
                  )}
                </div>
              )}
            </div>
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

      {visibleQuestions.length === 0 ? (
        <div className="card p-10 text-center text-dark-500">
          <div className="mb-4"><MagnifyingGlassIcon size={64} strokeWidth={1.5} className="inline text-dark-400" /></div>
          <p>Filtrelere uygun soru bulunamadı.</p>
          {(search.trim() || activeFilterCount > 0) && (
            <button type="button" className="btn btn-secondary mt-4" onClick={resetAll}>
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleQuestions.map(({ data }) => (
            <div key={data.id} className="card p-6 question-bank-card">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {data.type && <span className="chip chip-blue">{typeLabel(data.type)}</span>}
                  {data.category && <span className="chip chip-orange">{data.category}</span>}
                  {data.difficulty && (
                    <span className="chip bg-gray-200 text-gray-600">
                      {data.difficulty === 'easy' ? 'Kolay' : data.difficulty === 'medium' ? 'Orta' : 'Zor'}
                    </span>
                  )}
                  <span className={`chip ${data.isActive ? 'chip-green' : 'chip-orange'}`}>
                    {data.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  {data.hasTimer && data.timerSeconds > 0 && (
                    <span className="chip chip-blue inline-flex items-center gap-1">
                      <ClockIcon size={14} strokeWidth={2} /> {data.timerSeconds} sn
                    </span>
                  )}
                </div>

                {data.questionImageUrl && (
                  <div className="question-bank-image">
                    <img src={data.questionImageUrl} alt="Soru görseli" loading="lazy" />
                  </div>
                )}

                <h2 className="text-xl font-semibold text-dark-900">{data.questionText}</h2>

                {data.type === 'mcq' ? (
                  <ul className="question-bank-options">
                    {(data.options || []).filter(Boolean).map((option, index) => {
                      const isCorrect = data.correctAnswer && data.correctAnswer === option;
                      const imageUrl = data.hasImageOptions && Array.isArray(data.optionImageUrls)
                        ? data.optionImageUrls[index]
                        : null;
                      return (
                        <li key={index} className={`question-bank-option ${isCorrect ? 'correct' : ''}`}>
                          <div className="question-bank-option-header">
                            <span className="option-index">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{option}</span>
                            {isCorrect && <span className="option-correct inline-flex items-center gap-1"><CheckIcon size={14} strokeWidth={2} /> Doğru</span>}
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
                  data.correctAnswer ? (
                    <div className="question-bank-answer">
                      <span className="option-index"><CheckIcon size={18} strokeWidth={2} /></span>
                      <div>
                        <div className="option-label">Beklenen Yanıt</div>
                        <div className="option-text">{data.correctAnswer}</div>
                      </div>
                    </div>
                  ) : null
                )}

                <div className="question-bank-meta">
                  <span>Oluşturulma: <strong>{fmtDate(data.createdAt)}</strong></span>
                  <span>Güncelleme: <strong>{fmtDate(data.updatedAt || data.createdAt)}</strong></span>
                  <span>ID: <code>{data.id}</code></span>
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
