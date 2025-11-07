const { useState, useEffect, useRef } = React;

const Admin = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const questionImageRef = useRef(null);
  const optionImageRefs = useRef([]);
  const [form, setForm] = useState({
    questionText: '',
    type: 'mcq',
    category: '',
    difficulty: 'easy',
    options: ['', '', '', ''],
    correctAnswer: '',
    isActive: true,
    hasTimer: false,
    timerSeconds: 60,
    questionImageUrl: '',
    imageFile: null,
    hasImageOptions: false,
    optionImageUrls: ['', '', '', '']
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      await waitFirebase();
      const { db, collection, query, orderBy, onSnapshot } = window.firebase;
      const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, snap => {
        const ordered = snap.docs.map((d, index) => {
          const data = d.data();
          return {
            id: d.id,
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
      }, (error) => {
        console.error('Error loading questions:', error);
        toast('Sorular yüklenirken hata oluştu', 'error');
        setLoading(false);
      });
      return () => unsub();
    })();
  }, []);

  const reset = () => {
    setForm({
      questionText: '',
      type: 'mcq',
      category: '',
      difficulty: 'easy',
      options: ['', '', '', ''],
      correctAnswer: '',
      isActive: true,
      hasTimer: false,
      timerSeconds: 60,
      questionImageUrl: '',
      hasImageOptions: false,
      optionImageUrls: ['', '', '', '']
    });
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
    console.log('Uploading question image...', file.name);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
      const fileName = `question_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const storageRef = ref(storage, `questions/images/${fileName}`);
      
      console.log('Storage ref created:', storageRef.fullPath);
      await uploadBytes(storageRef, file);
      console.log('File uploaded');
      
      const url = await getDownloadURL(storageRef);
      console.log('Download URL:', url);
      
      updateField('questionImageUrl', url);
      toast('Görsel yüklendi', 'success');
    } catch (e) {
      console.error('Upload error:', e);
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
    console.log('Uploading option image...', index, file.name);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
      const fileName = `option_${Date.now()}_${index}_${file.name.replace(/\s/g, '_')}`;
      const storageRef = ref(storage, `questions/options/${fileName}`);
      
      console.log('Storage ref created:', storageRef.fullPath);
      await uploadBytes(storageRef, file);
      console.log('File uploaded');
      
      const url = await getDownloadURL(storageRef);
      console.log('Download URL:', url);
      
      const newUrls = [...form.optionImageUrls];
      newUrls[index] = url;
      updateField('optionImageUrls', newUrls);
      toast('Seçenek görseli yüklendi', 'success');
    } catch (e) {
      console.error('Upload error:', e);
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
      questionImageUrl: q.questionImageUrl || '',
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
      await waitFirebase();
      const { db, collection, doc, addDoc, updateDoc, serverTimestamp } = window.firebase;
      
      // Apply text validation
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
        questionImageUrl: form.questionImageUrl || '',
        hasImageOptions: form.hasImageOptions,
        optionImageUrls: form.hasImageOptions ? form.optionImageUrls.filter(u => u.trim()) : [],
        updatedAt: serverTimestamp()
      };
      
      if (editId) {
        await updateDoc(doc(db, 'questions', editId), data);
        toast('Soru güncellendi', 'success');
      } else {
        data.createdAt = serverTimestamp();
        data.order = questions.length;
        await addDoc(collection(db, 'questions'), data);
        toast('Soru eklendi', 'success');
      }
      reset();
    } catch(e) {
      console.error('Save error:', e);
      toast('Soru kaydedilirken hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (nextQuestions) => {
    const previous = questions.map(q => ({ ...q }));
    const withUpdatedOrder = nextQuestions.map((q, index) => ({ ...q, order: index }));
    setQuestions(withUpdatedOrder);
    setReordering(true);
    try {
      await waitFirebase();
      const { db, writeBatch, doc } = window.firebase;
      const batch = writeBatch(db);
      withUpdatedOrder.forEach((q, index) => {
        batch.update(doc(db, 'questions', q.id), { order: index });
      });
      await batch.commit();
      toast('Soru sırası güncellendi', 'success');
    } catch (e) {
      console.error('Reorder error:', e);
      setQuestions(previous);
      toast('Soru sırası kaydedilemedi', 'error');
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;
    try {
      await waitFirebase();
      const { db, doc, deleteDoc } = window.firebase;
      await deleteDoc(doc(db, 'questions', id));
      toast('Soru silindi', 'success');
    } catch(e) {
      console.error('Delete error:', e);
      toast('Soru silinirken hata oluştu', 'error');
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await waitFirebase();
      const { db, doc, updateDoc } = window.firebase;
      await updateDoc(doc(db, 'questions', id), { isActive: !currentStatus });
      toast((!currentStatus ? 'Soru aktif edildi' : 'Soru pasif edildi'), 'success');
    } catch(e) {
      console.error('Toggle error:', e);
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
      extra={!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Yeni Soru</button>}
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
          setShowForm={setShowForm}
          onReorder={handleReorder}
          reordering={reordering}
        />
      )}
    </Page>
  );
};

window.Admin = Admin;
