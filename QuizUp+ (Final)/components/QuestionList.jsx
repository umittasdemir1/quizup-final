const QuestionList = ({ questions, handleEdit, handleDelete, toggleActive, setShowForm }) => {
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
      {questions.map(q => (
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
      ))}
    </div>
  );
};

window.QuestionList = QuestionList;
