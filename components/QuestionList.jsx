const QuestionList = ({ questions, handleEdit, handleDelete, toggleActive, setShowForm }) => {
  const { useState, useEffect, useRef } = React;
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    status: [] // 'active', 'inactive'
  });
  const filterRef = useRef(null);

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
    setFilters({ categories: [], difficulties: [], status: [] });
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
    // Status filter
    if (filters.status.length > 0) {
      if (filters.status.includes('active') && !q.isActive) return false;
      if (filters.status.includes('inactive') && q.isActive) return false;
      if (filters.status.length === 2) return true; // Both selected = show all
    }
    return true;
  });

  // Count active filters
  const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.status.length;

  if (questions.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-dark-500 text-lg">Henüz soru eklenmemiş</p>
        <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>İlk Soruyu Ekle</button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Filter Section */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-dark-600">
          {filteredQuestions.length} / {questions.length} soru gösteriliyor
        </div>

        <div className="relative" ref={filterRef}>
          <button
            className="btn btn-secondary flex items-center gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 Filtrele
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-500 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4" style={{ animation: 'fadeIn 0.2s ease-in' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-dark-900">Filtreler</h3>
                {activeFilterCount > 0 && (
                  <button
                    className="text-xs text-primary-500 hover:text-primary-600 font-semibold"
                    onClick={clearFilters}
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>

              {/* Category Filter */}
              {uniqueCategories.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-dark-700 mb-2">📁 Kategori</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uniqueCategories.map(cat => (
                      <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filters.categories.includes(cat)}
                          onChange={() => toggleFilter('categories', cat)}
                          className="w-4 h-4 text-primary-500 rounded"
                        />
                        <span className="text-sm text-dark-800">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty Filter */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-dark-700 mb-2">⚡ Zorluk</h4>
                <div className="space-y-2">
                  {difficulties.map(diff => (
                    <label key={diff.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={filters.difficulties.includes(diff.value)}
                        onChange={() => toggleFilter('difficulties', diff.value)}
                        className="w-4 h-4 text-primary-500 rounded"
                      />
                      <span className="text-sm text-dark-800">{diff.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h4 className="text-sm font-semibold text-dark-700 mb-2">📊 Durum</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.status.includes('active')}
                      onChange={() => toggleFilter('status', 'active')}
                      className="w-4 h-4 text-primary-500 rounded"
                    />
                    <span className="text-sm text-dark-800">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={filters.status.includes('inactive')}
                      onChange={() => toggleFilter('status', 'inactive')}
                      className="w-4 h-4 text-primary-500 rounded"
                    />
                    <span className="text-sm text-dark-800">Pasif</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-dark-500 text-lg">Filtreye uygun soru bulunamadı</p>
          <button
            className="btn btn-secondary mt-4"
            onClick={clearFilters}
          >
            Filtreleri Temizle
          </button>
        </div>
      ) : (
        filteredQuestions.map(q => (
        <div key={q.id} className="card p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="chip chip-blue">{typeLabel(q.type)}</span>
                <span className="chip chip-orange">{q.category}</span>
                <span className="chip bg-gray-200 text-gray-600">
                  {q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : 'Zor'}
                </span>
              </div>
              <p className="font-semibold text-lg text-dark-900 mb-2 break-words">{q.questionText}</p>
              {q.type === 'mcq' && q.options && (
                <div className="text-sm text-dark-600 mt-2 break-words">
                  <b>Seçenekler:</b> {q.options.join(' • ')}
                  <br/><b>Doğru:</b> <span className="text-accent-600 font-semibold break-words">{q.correctAnswer}</span>
                </div>
              )}
              <div className="text-xs text-dark-400 mt-2">
                Oluşturulma: {fmtDate(q.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex flex-col items-center gap-1">
                <label className="toggle-switch">
                  <input type="checkbox" checked={q.isActive} onChange={() => toggleActive(q.id, q.isActive)} />
                  <span className="toggle-slider"></span>
                </label>
                <span className="text-xs text-dark-500">{q.isActive ? 'Aktif' : 'Pasif'}</span>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost text-sm px-3 py-2" onClick={() => handleEdit(q)}>✏️ Düzenle</button>
                <button className="btn btn-danger text-sm px-3 py-2" onClick={() => handleDelete(q.id)}>🗑️</button>
              </div>
            </div>
          </div>
        </div>
        ))
      )}
    </div>
  );
};

window.QuestionList = QuestionList;
