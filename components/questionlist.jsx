const QuestionList = ({ questions, handleEdit, handleDelete, toggleActive, onCreateNew }) => {
  const { useState, useEffect, useRef, useMemo } = React;
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    statuses: [],
    types: [],
    timers: []
  });
  const [sortOption, setSortOption] = useState('order-asc');
  const filterRef = useRef(null);
  const animatedPlaceholder = useAnimatedPlaceholder();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showFilters) return;
      if (event.target.closest('[data-question-filter-toggle]')) return;
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  const uniqueCategories = useMemo(
    () => [...new Set(questions.map(q => q.category).filter(Boolean))].sort(),
    [questions]
  );

  const uniqueTypes = useMemo(
    () => [...new Set(questions.map(q => q.type).filter(Boolean))],
    [questions]
  );

  const difficulties = useMemo(() => ([
    { value: 'easy', label: 'Kolay' },
    { value: 'medium', label: 'Orta' },
    { value: 'hard', label: 'Zor' }
  ]), []);

  const sortOptions = useMemo(() => ([
    { value: 'order-asc', label: 'Numara (Artan)' },
    { value: 'order-desc', label: 'Numara (Azalan)' },
    { value: 'created-desc', label: 'Oluşturulma (Yeni → Eski)' },
    { value: 'created-asc', label: 'Oluşturulma (Eski → Yeni)' },
    { value: 'category-asc', label: 'Kategori (A → Z)' }
  ]), []);

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

  const activeFilterCount = filters.categories.length +
    filters.difficulties.length +
    filters.statuses.length +
    filters.types.length +
    filters.timers.length;

  const getDisplayOrder = (question, index) => {
    return typeof question.order === 'number' ? question.order + 1 : index + 1;
  };

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

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'order-desc':
          return b.orderNumber - a.orderNumber || a.originalIndex - b.originalIndex;
        case 'created-desc':
          return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
        case 'created-asc':
          return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
        case 'category-asc':
          return (a.data.category || '').localeCompare(b.data.category || '') || (a.orderNumber - b.orderNumber);
        case 'order-asc':
        default:
          return a.orderNumber - b.orderNumber || a.originalIndex - b.originalIndex;
      }
    });

    return sorted;
  }, [questions, filters, search, sortOption]);

  if (questions.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-dark-500 text-lg">Henüz soru eklenmemiş</p>
        <button className="btn btn-primary mt-4" onClick={onCreateNew}>İlk Soruyu Ekle</button>
      </div>
    );
  }

  const QuestionCard = ({ question, displayOrder }) => (
    <div className="card p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4 w-full">
          <div className="flex flex-col items-center gap-1 pt-1 text-dark-400">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-semibold">
              {displayOrder}
            </span>
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="chip chip-blue">{typeLabel(question.type)}</span>
              {question.category && <span className="chip chip-orange">{question.category}</span>}
              {question.difficulty && (
                <span className="chip bg-gray-200 text-gray-600">
                  {question.difficulty === 'easy' ? 'Kolay' : question.difficulty === 'medium' ? 'Orta' : 'Zor'}
                </span>
              )}
              <span className={`chip ${question.isActive ? 'chip-green' : 'chip-orange'}`}>
                {question.isActive ? 'Aktif' : 'Pasif'}
              </span>
              {question.hasTimer && Number(question.timerSeconds) > 0 && (
                <span className="chip chip-blue">⏱️ {question.timerSeconds} sn</span>
              )}
            </div>
            <p className="font-semibold text-lg text-dark-900 mb-2 break-words">{question.questionText}</p>
            {question.type === 'mcq' && question.options && (
              <div className="text-sm text-dark-600 mt-2 break-words">
                <b>Seçenekler:</b> {question.options.join(' • ')}
                <br />
                <b>Doğru:</b> <span className="text-accent-600 font-semibold break-words">{question.correctAnswer}</span>
              </div>
            )}
            <div className="text-xs text-dark-400 mt-2">
              Oluşturulma: {fmtDate(question.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <label className="toggle-switch">
              <input type="checkbox" checked={question.isActive} onChange={() => toggleActive(question.id, question.isActive)} />
              <span className="toggle-slider"></span>
            </label>
            <span className="text-xs text-dark-500">{question.isActive ? 'Aktif' : 'Pasif'}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost text-sm px-3 py-2" onClick={() => handleEdit(question)}>✏️ Düzenle</button>
            <button className="btn btn-danger text-sm px-3 py-2" onClick={() => handleDelete(question.id)}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <div className="question-toolbar">
          <div className="relative flex-1 w-full">
            <span className="question-search-icon"><MagnifyingGlassIcon size={18} strokeWidth={2} /></span>
            <input
              type="search"
              className="field w-full pl-10"
              placeholder={animatedPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="question-toolbar-actions">
            <select
              className="field question-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="relative" ref={filterRef}>
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
              {showFilters && (
                <div className="question-filter-panel">
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
                      <h3 className="question-filter-title">📊 Durum</h3>
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

                    <div>
                      <h3 className="question-filter-title">⏱️ Süre</h3>
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
      </div>

      {visibleQuestions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-dark-500 text-lg">Filtrelere uygun soru bulunamadı.</p>
          {(search.trim() || activeFilterCount > 0) && (
            <button type="button" className="btn btn-secondary mt-4" onClick={resetAll}>
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleQuestions.map(({ data, orderNumber }) => (
            <QuestionCard key={data.id} question={data} displayOrder={orderNumber} />
          ))}
        </div>
      )}
    </div>
  );
};

window.QuestionList = QuestionList;
