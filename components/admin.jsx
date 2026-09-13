const { useState, useEffect, useRef } = React;

// Keep the list mounted behind a native modal so editing cannot collapse the page.
const QuestionEditorDialog = ({ children, onClose, busy }) => {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialogRef} className="question-editor-dialog" aria-label="Soru düzenleme" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="flex justify-end px-4 pt-3"><button type="button" className="btn btn-ghost" aria-label="Düzenlemeyi kapat" disabled={busy} onClick={onClose}>✕</button></div>
    {children}
  </dialog>;
};

const Admin = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pendingActive = useRef(new Map());
  const [pendingActiveIds, setPendingActiveIds] = useState(new Set());
  const questionImageRef = useRef(null);
  const optionImageRefs = useRef([]);
  const blankForm = {
    questionText: '',
    type: 'mcq',
    category: '',
    difficulty: 'easy',
    options: ['', '', '', ''],
    correctAnswer: '',
    isActive: true,
    hasTimer: false,
    timerSeconds: 60,
    hasQuestionImage: false,
    questionImageUrl: '',
    imageFile: null,
    hasImageOptions: false,
    optionImageUrls: ['', '', '', '']
  };
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});

  const getDbCompanyId = () => {
    const cu = getCurrentUser();
    if (!cu) return null;
    if (cu.isSuperAdmin) {
      try {
        const sel = JSON.parse(localStorage.getItem('superadmin:selectedCompanyData') || 'null');
        if (sel?.id && sel.id !== 'all') return sel.id;
        return null;
      } catch { return null; }
    }
    return cu.companyId || null;
  };

  useEffect(() => {
    let unsub = null;

    const loadQuestions = () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const companyId = getDbCompanyId();

      if (!companyId && !currentUser.isSuperAdmin) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      unsub = window.db.onQuestionsSnapshot(companyId, (data) => {
        const ordered = data
          .map((q, index) => ({ ...q, __originalIndex: index }))
          .sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : a.__originalIndex;
            const orderB = typeof b.order === 'number' ? b.order : b.__originalIndex;
            return orderA - orderB;
          })
          .map(({ __originalIndex, ...rest }) => rest);

        setQuestions(ordered.map(q => {
          const pending = pendingActive.current.get(q.id);
          if (!pending) return q;
          if (pending.confirmed && q.isActive === pending.value) pendingActive.current.delete(q.id);
          return { ...q, isActive: pending.value };
        }));
        setLoading(false);
      });
    };

    loadQuestions();

    const handleCompanyChange = () => {
      if (unsub) unsub();
      pendingActive.current.clear();
      setPendingActiveIds(new Set());
      setLoading(true);
      loadQuestions();
    };

    window.addEventListener('company-changed', handleCompanyChange);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('company-changed', handleCompanyChange);
    };
  }, []);

  const startCreate = () => {
    setForm({ ...blankForm });
    setEditId(null);
    setErrors({});
    setShowForm(true);
  };

  const reset = () => {
    setForm({ ...blankForm });
    setEditId(null);
    setShowForm(false);
    setErrors({});
  };

  const uploadQuestionImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast('Lütfen bir resim dosyası seçin', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('Dosya boyutu en fazla 2MB olabilir', 'error');
      return;
    }

    setUploading(true);
    try {
      const fileName = `question_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const url = await window.db.uploadFile(`questions/images/${fileName}`, file);
      updateField('questionImageUrl', url);
      toast('Görsel yüklendi', 'success');
    } catch (e) {
      window.devError('Upload error:', e);
      toast('Görsel yüklenirken hata oluştu: ' + e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadOptionImage = async (file, index) => {
    if (!file || !file.type.startsWith('image/')) {
      toast('Lütfen bir resim dosyası seçin', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('Dosya boyutu en fazla 2MB olabilir', 'error');
      return;
    }

    setUploading(true);
    try {
      const fileName = `option_${Date.now()}_${index}_${file.name.replace(/\s/g, '_')}`;
      const url = await window.db.uploadFile(`questions/options/${fileName}`, file);
      const newUrls = [...form.optionImageUrls];
      newUrls[index] = url;
      updateField('optionImageUrls', newUrls);
      toast('Seçenek görseli yüklendi', 'success');
    } catch (e) {
      window.devError('Upload error:', e);
      toast('Görsel yüklenirken hata oluştu: ' + e.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (q) => {
    setEditId(q.id);
    setForm({
      questionText: q.questionText || '',
      type: q.type || 'mcq',
      category: q.category || '',
      difficulty: q.difficulty || 'easy',
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer || '',
      isActive: q.isActive ?? true,
      hasTimer: q.hasTimer || false,
      timerSeconds: q.timerSeconds || 60,
      hasQuestionImage: q.hasQuestionImage || !!q.questionImageUrl,
      questionImageUrl: q.questionImageUrl || '',
      imageFile: null,
      hasImageOptions: q.hasImageOptions || false,
      optionImageUrls: q.optionImageUrls || ['', '', '', '']
    });
    setShowForm(true);
    setErrors({});
  };

  const handleSave = async () => {
    const validationErrors = validateQuestion(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast('Lütfen tüm zorunlu alanları doldurun', 'error');
      return;
    }

    setSaving(true);
    try {
      const validatedQuestionText = window.validateText ? window.validateText(form.questionText.trim()) : form.questionText.trim();
      const validatedCategory = window.validateText ? window.validateText(form.category.trim()) : form.category.trim();
      const validatedOptions = form.type === 'mcq'
        ? form.options.filter(o => o.trim()).map(o => window.validateText ? window.validateText(o.trim()) : o.trim())
        : [];

      const data = {
        questionText: validatedQuestionText,
        type: form.type,
        category: validatedCategory,
        difficulty: form.difficulty,
        options: validatedOptions,
        correctAnswer: form.type === 'mcq' ? form.correctAnswer.trim() : '',
        isActive: form.isActive,
        hasTimer: form.hasTimer,
        timerSeconds: form.hasTimer ? parseInt(form.timerSeconds) : 0,
        hasQuestionImage: form.hasQuestionImage,
        questionImageUrl: form.questionImageUrl || '',
        hasImageOptions: form.hasImageOptions,
        optionImageUrls: form.hasImageOptions ? form.optionImageUrls.filter(u => u.trim()) : [],
      };

      if (editId) {
        const updated = await window.db.updateQuestion(editId, data);
        pendingActive.current.delete(editId);
        setQuestions(items => items.map(q => q.id === editId ? { ...q, ...data, ...updated } : q));
        toast('Soru güncellendi', 'success');
      } else {
        const companyId = getDbCompanyId();
        if (!companyId) {
          toast('Soru eklemek için bir şirket seçin', 'error');
          setSaving(false);
          return;
        }
        const added = await window.db.addQuestion(data, companyId);
        setQuestions(items => [...items.filter(q => q.id !== added.id), added]);
        toast('Soru eklendi', 'success');
      }
      reset();
    } catch(e) {
      window.devError('Save error:', e);
      toast('Soru kaydedilirken hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;
    try {
      await window.db.deleteQuestion(id);
      setQuestions(items => items.filter(q => q.id !== id));
      toast('Soru silindi', 'success');
    } catch(e) {
      window.devError('Delete error:', e);
      toast('Soru silinirken hata oluştu', 'error');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    if (pendingActive.current.get(id)?.confirmed === false) return;
    const change = { value: !currentStatus, confirmed: false };
    pendingActive.current.set(id, change);
    setPendingActiveIds(ids => new Set([...ids, id]));
    setQuestions(items => items.map(q => q.id === id ? { ...q, isActive: change.value } : q));
    try {
      await window.db.updateQuestion(id, { isActive: change.value });
      change.confirmed = true;
      toast((change.value ? 'Soru aktif edildi' : 'Soru pasif edildi'), 'success');
    } catch(e) {
      if (pendingActive.current.get(id) === change) {
        pendingActive.current.delete(id);
        setQuestions(items => items.map(q => q.id === id ? { ...q, isActive: currentStatus } : q));
      }
      window.devError('Toggle error:', e);
      toast('Durum kaydedilemedi; önceki duruma döndürüldü.', 'error');
    } finally {
      setPendingActiveIds(ids => { const next = new Set(ids); next.delete(id); return next; });
    }
  };

  const updateField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors[k];
        return newErrors;
      });
    }
  };

  const updateOption = (i, v) => {
    const opts = [...form.options];
    opts[i] = v;
    updateField('options', opts);
  };

  if (loading) return <Page title="Soru Havuzu"><LoadingSpinner text="Sorular yükleniyor..." /></Page>;

  return (
    <Page 
      title="Soru Havuzu" 
      subtitle={`Toplam ${questions.length} soru`}
      extra={!showForm && <button className="btn btn-primary" onClick={startCreate}>+ Yeni Soru</button>}
    >
      <QuestionList
        questions={questions}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        toggleActive={toggleActive}
        pendingActiveIds={pendingActiveIds}
        onCreateNew={startCreate}
      />
      {showForm && (
        <QuestionEditorDialog onClose={reset} busy={saving || uploading}>
          <AdminForm
            form={form}
            errors={errors}
            editId={editId}
            saving={saving}
            uploading={uploading}
            questionImageRef={questionImageRef}
            optionImageRefs={optionImageRefs}
            updateField={updateField}
            updateOption={updateOption}
            uploadQuestionImage={uploadQuestionImage}
            uploadOptionImage={uploadOptionImage}
            handleSave={handleSave}
            reset={reset}
          />
        </QuestionEditorDialog>
      )}
    </Page>
  );
};

window.Admin = Admin;
