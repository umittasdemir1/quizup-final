const QuestionList = ({ questions, handleEdit, handleDelete, toggleActive, togglingStates = {}, setShowForm, onReorder, reordering }) => {
  const { useState, useEffect, useRef } = React;
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    status: [] // 'active', 'inactive'
  });
  const filterRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

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

  const filtersActive = filters.categories.length + filters.difficulties.length + filters.status.length > 0;
  const reorderAvailable = Boolean(typeof onReorder === 'function' && !filtersActive);
  const canDrag = reorderAvailable && !reordering;

  useEffect(() => {
    if (!canDrag) {
      setDraggingId(null);
      setDragOverId(null);
    }
  }, [canDrag]);

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

  const QuestionCard = ({
    question,
    index,
    isDragging = false,
    isDragOver = false,
    showHandle = false,
    draggable = false,
    onDragStart,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd
  }) => (
    <div
      className={`card p-6 transition ${isDragging ? 'shadow-lg border-primary-200 bg-primary-50/60' : ''} ${isDragOver ? 'border-primary-300 ring-2 ring-primary-100' : ''}`}
      style={{ opacity: isDragging ? 0.95 : 1 }}
      data-question-card="true"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4 w-full">
          {showHandle ? (
            <div className="flex flex-col items-center gap-1 pt-1 text-dark-400">
              <button
                type="button"
                className={`rounded-full px-3 py-2 shadow-inner transition border border-gray-200 ${isDragging ? 'cursor-grabbing bg-gray-200' : 'cursor-grab bg-gray-100 hover:bg-gray-200'}`}
                aria-label="Sürükle"
              >
                <span className="text-xl leading-none">⠿</span>
              </button>
              <span className="text-xs font-semibold text-dark-400">#{index + 1}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 pt-1 text-dark-400">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-semibold">{index + 1}</span>
            </div>
          )}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="chip chip-blue">{typeLabel(question.type)}</span>
              <span className="chip chip-orange">{question.category}</span>
              <span className="chip bg-gray-200 text-gray-600">
                {question.difficulty === 'easy' ? 'Kolay' : question.difficulty === 'medium' ? 'Orta' : 'Zor'}
              </span>
            </div>
            <p className="font-semibold text-lg text-dark-900 mb-2 break-words">{question.questionText}</p>
            {question.type === 'mcq' && question.options && (
              <div className="text-sm text-dark-600 mt-2 break-words">
                <b>Seçenekler:</b> {question.options.join(' • ')}
                <br/><b>Doğru:</b> <span className="text-accent-600 font-semibold break-words">{question.correctAnswer}</span>
              </div>
            )}
            <div className="text-xs text-dark-400 mt-2">
              Oluşturulma: {fmtDate(question.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <label className={`toggle-switch ${togglingStates[question.id] ? 'opacity-60 pointer-events-none' : ''}`}>
              <input
                type="checkbox"
                checked={Boolean(question.isActive)}
                onChange={() => toggleActive(question.id, Boolean(question.isActive))}
                disabled={Boolean(togglingStates[question.id])}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="text-xs text-dark-500">
              {togglingStates[question.id]
                ? 'Güncelleniyor...'
                : Boolean(question.isActive) ? 'Aktif' : 'Pasif'}
            </span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost text-sm px-3 py-2" onClick={() => handleEdit(question)}>✏️ Düzenle</button>
            <button className="btn btn-danger text-sm px-3 py-2" onClick={() => handleDelete(question.id)}>🗑️</button>
          </div>
        </div>
      </div>
    </div>
  );

  const arrayMove = (items, fromIndex, toIndex) => {
    const list = [...items];
    const startIndex = fromIndex < 0 ? list.length + fromIndex : fromIndex;
    if (startIndex < 0 || startIndex >= list.length) return list;
    const endIndex = toIndex < 0 ? list.length + toIndex : toIndex;
    const [moved] = list.splice(startIndex, 1);
    const boundedIndex = Math.max(0, Math.min(endIndex, list.length));
    list.splice(boundedIndex, 0, moved);
    return list;
  };

  const handleDragStart = (event, id) => {
    if (!canDrag) return;
    event.dataTransfer.effectAllowed = 'move';
    try {
      event.dataTransfer.setData('text/plain', id);
    } catch (error) {
      // Ignore browsers that disallow custom MIME types.
    }
    setDraggingId(id);
    setDragOverId(null);
  };

  const handleDragEnter = (event, id) => {
    if (!canDrag || !draggingId || draggingId === id) return;
    event.preventDefault();
    setDragOverId(id);
  };

  const handleDragOver = (event, id) => {
    if (!canDrag || !draggingId || draggingId === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (id) {
      setDragOverId(id);
    }
  };

  const commitReorder = (sourceId, targetId) => {
    if (!canDrag || !sourceId || sourceId === targetId) return;
    const oldIndex = questions.findIndex(q => q.id === sourceId);
    if (oldIndex === -1) return;
    let newIndex;
    if (!targetId) {
      newIndex = questions.length;
    } else {
      newIndex = questions.findIndex(q => q.id === targetId);
      if (newIndex === -1) {
        newIndex = questions.length;
      }
    }
    const reordered = arrayMove(questions, oldIndex, newIndex);
    if (onReorder) {
      onReorder(reordered);
    }
  };

  const handleDrop = (event, id) => {
    if (!canDrag || !draggingId) return;
    event.preventDefault();
    commitReorder(draggingId, id);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragLeave = (id) => {
    if (!canDrag) return;
    if (dragOverId === id) {
      setDragOverId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleContainerDragOver = (event) => {
    if (!canDrag || !draggingId) return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverId('__container');
  };

  const handleContainerDrop = (event) => {
    if (!canDrag || !draggingId) return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    commitReorder(draggingId, null);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleContainerDragLeave = (event) => {
    if (!canDrag) return;
    if (event.target !== event.currentTarget) return;
    if (dragOverId === '__container') {
      setDragOverId(null);
    }
  };

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

      {reorderAvailable && (
        <div className="card p-4 bg-secondary-50 border border-secondary-200 text-sm text-dark-600 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium text-dark-800">
            <span className="text-lg">🧩</span>
            <span>Soruları sürükleyip bırakarak sıralayabilirsiniz.</span>
          </div>
          <div className="text-xs text-dark-500">Sıralama filtreler aktif değilken kullanılabilir.</div>
          {reordering && <div className="text-xs text-primary-600 font-semibold">Değişiklikler kaydediliyor...</div>}
        </div>
      )}

      {!reorderAvailable && filtersActive && (
        <div className="card p-4 bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
          Filtreler açıkken sürükle-bırak sıralama devre dışıdır. Lütfen filtreleri temizleyin.
        </div>
      )}

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
      ) : reorderAvailable ? (
        <div
          className="grid gap-4"
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
          onDragLeave={handleContainerDragLeave}
        >
          {filteredQuestions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={index}
              showHandle
              draggable={canDrag}
              isDragging={draggingId === q.id}
              isDragOver={dragOverId === q.id}
              onDragStart={(event) => handleDragStart(event, q.id)}
              onDragEnter={(event) => handleDragEnter(event, q.id)}
              onDragOver={(event) => handleDragOver(event, q.id)}
              onDragLeave={() => handleDragLeave(q.id)}
              onDrop={(event) => handleDrop(event, q.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
          {draggingId && (
            <div
              className={`h-10 rounded-xl border-2 border-dashed transition ${dragOverId === '__container' ? 'border-primary-400 bg-primary-50' : 'border-transparent'}`}
            ></div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredQuestions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
};

window.QuestionList = QuestionList;
