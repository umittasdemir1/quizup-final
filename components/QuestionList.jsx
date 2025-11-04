const QuestionList = ({ questions, handleEdit, handleDelete, toggleActive, setShowForm, onReorder, reordering }) => {
  const { useState, useEffect, useRef, useMemo } = React;
  const dndCore = window.DndKitCore;
  const dndSortable = window.DndKitSortable;
  const dndUtils = window.DndKitUtilities;
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

  const isDndReady = Boolean(dndCore?.DndContext && dndSortable?.SortableContext && dndUtils?.CSS);
  const filtersActive = filters.categories.length + filters.difficulties.length + filters.status.length > 0;
  const isReorderEnabled = Boolean(isDndReady && typeof onReorder === 'function' && !filtersActive);

  const sensors = useMemo(() => {
    if (!isReorderEnabled) return null;
    const { useSensor, useSensors, PointerSensor, KeyboardSensor } = dndCore;
    const { sortableKeyboardCoordinates } = dndSortable;
    if (!useSensor || !useSensors || !PointerSensor) return null;
    const sensorList = [useSensor(PointerSensor, { activationConstraint: { distance: 8 } })];
    if (sortableKeyboardCoordinates && KeyboardSensor) {
      sensorList.push(useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    }
    return useSensors(...sensorList);
  }, [dndCore, dndSortable, isReorderEnabled]);

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

  const QuestionCard = ({ question, index, dragHandleProps = {}, isDragging = false, showHandle = false }) => (
    <div
      className={`card p-6 transition ${isDragging ? 'shadow-lg border-primary-200 bg-primary-50/60' : ''}`}
      style={{ opacity: isDragging ? 0.95 : 1 }}
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4 w-full">
          {showHandle ? (
            <div className="flex flex-col items-center gap-1 pt-1 text-dark-400">
              <button
                type="button"
                className={`rounded-full px-3 py-2 shadow-inner transition border border-gray-200 ${isDragging ? 'cursor-grabbing bg-gray-200' : 'cursor-grab bg-gray-100 hover:bg-gray-200'}`}
                aria-label="Sürükle"
                {...dragHandleProps}
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

  const SortableQuestionCard = ({ question, index }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = dndSortable.useSortable({
      id: question.id,
      disabled: reordering
    });

    const style = {
      transform: transform ? dndUtils.CSS.Transform.toString(transform) : undefined,
      transition,
      zIndex: isDragging ? 40 : 'auto'
    };

    return (
      <div ref={setNodeRef} style={style}>
        <QuestionCard
          question={question}
          index={index}
          isDragging={isDragging}
          showHandle
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </div>
    );
  };

  const handleDragEnd = (event) => {
    if (!event?.over || event.active.id === event.over.id) return;
    const { arrayMove } = dndSortable;
    if (!arrayMove) return;
    const oldIndex = questions.findIndex(q => q.id === event.active.id);
    const newIndex = questions.findIndex(q => q.id === event.over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(questions, oldIndex, newIndex);
    onReorder && onReorder(reordered);
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

      {isReorderEnabled && (
        <div className="card p-4 bg-secondary-50 border border-secondary-200 text-sm text-dark-600 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium text-dark-800">
            <span className="text-lg">🧩</span>
            <span>Soruları sürükleyip bırakarak sıralayabilirsiniz.</span>
          </div>
          <div className="text-xs text-dark-500">Sıralama filtreler aktif değilken kullanılabilir.</div>
          {reordering && <div className="text-xs text-primary-600 font-semibold">Değişiklikler kaydediliyor...</div>}
        </div>
      )}

      {!isReorderEnabled && filtersActive && (
        <div className="card p-4 bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
          Filtreler açıkken sürükle-bırak sıralama devre dışıdır. Lütfen filtreleri temizleyin.
        </div>
      )}

      {!isReorderEnabled && !filtersActive && typeof onReorder === 'function' && !isDndReady && (
        <div className="card p-4 bg-red-50 border border-red-200 text-xs text-red-700">
          Sürükle-bırak kütüphanesi yüklenemedi. Lütfen sayfayı yenileyin.
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
      ) : isReorderEnabled ? (
        <dndCore.DndContext
          sensors={sensors || undefined}
          collisionDetection={dndCore.closestCenter}
          onDragEnd={handleDragEnd}
        >
          <dndSortable.SortableContext items={filteredQuestions.map(q => q.id)} strategy={dndSortable.verticalListSortingStrategy}>
            <div className="grid gap-4">
              {filteredQuestions.map((q, index) => (
                <SortableQuestionCard key={q.id} question={q} index={index} />
              ))}
            </div>
          </dndSortable.SortableContext>
        </dndCore.DndContext>
      ) : (
        <div className="grid gap-4">
          {filteredQuestions.map((q, index) => (
            <QuestionCard key={q.id} question={q} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

window.QuestionList = QuestionList;
