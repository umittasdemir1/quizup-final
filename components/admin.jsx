const { useState, useEffect, useRef } = React;

const Admin = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    optionImageUrls: ['', '', '', ''],
    orderNumber: 1
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

        setQuestions(ordered);
        setLoading(false);
      });
    };

    loadQuestions();

    const handleCompanyChange = () => {
      if (unsub) unsub();
      setLoading(true);
      loadQuestions();
    };

    window.addEventListener('company-changed', handleCompanyChange);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('company-changed', handleCompanyChange);
    };
  }, []);

  const getDisplayOrder = (question, index) => (
    typeof question.order === 'number' ? question.order + 1 : index + 1
  );

  const getNextOrderNumber = () => {
    if (!questions.length) return 1;
    const numbers = questions.map((q, index) => getDisplayOrder(q, index));
    return Math.max(...numbers) + 1;
  };

  const startCreate = () => {
    setForm({ ...blankForm, orderNumber: getNextOrderNumber() });
    setEditId(null);
    setErrors({});
    setShowForm(true);
  };

  const reset = () => {
    setForm({ ...blankForm, orderNumber: getNextOrderNumber() });
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
    const index = questions.findIndex(item => item.id === q.id);
    const orderNumber = getDisplayOrder(q, index >= 0 ? index : questions.length);
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
      optionImageUrls: q.optionImageUrls || ['', '', '', ''],
      orderNumber
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

    const orderNumber = parseInt(form.orderNumber, 10);
    if (!Number.isFinite(orderNumber) || orderNumber < 1) {
      setErrors(prev => ({ ...prev, orderNumber: 'Geçerli bir numara giriniz' }));
      toast('Geçerli bir numara giriniz', 'error');
      return;
    }

    const existingNumbers = questions
      .filter(q => q.id !== editId)
      .map((q, index) => getDisplayOrder(q, index));

    if (existingNumbers.includes(orderNumber)) {
      setErrors(prev => ({ ...prev, orderNumber: 'Numara Kullanıldı' }));
      toast('Numara Kullanıldı', 'error');
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
        order: orderNumber - 1,
      };

      if (editId) {
        await window.db.updateQuestion(editId, data);
        toast('Soru güncellendi', 'success');
      } else {
        const companyId = getDbCompanyId();
        if (!companyId) {
          toast('Soru eklemek için bir şirket seçin', 'error');
          setSaving(false);
          return;
        }
        await window.db.addQuestion(data, companyId);
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
      toast('Soru silindi', 'success');
    } catch(e) {
      window.devError('Delete error:', e);
      toast('Soru silinirken hata oluştu', 'error');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await window.db.updateQuestion(id, { isActive: !currentStatus });
      toast((!currentStatus ? 'Soru aktif edildi' : 'Soru pasif edildi'), 'success');
    } catch(e) {
      window.devError('Toggle error:', e);
      toast('Durum değiştirilemedi', 'error');
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
      {showForm ? (
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
      ) : (
        <QuestionList
          questions={questions}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          toggleActive={toggleActive}
          onCreateNew={startCreate}
        />
      )}
    </Page>
  );
};

window.Admin = Admin;
