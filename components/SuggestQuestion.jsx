const { useState, useRef } = React;

const SuggestQuestion = () => {
  const currentUser = getCurrentUser();

  const [form, setForm] = useState({
    questionText: '',
    type: 'mcq',
    category: '',
    difficulty: 'medium',
    options: ['', '', '', ''],
    correctAnswer: '',
    hasTimer: false,
    timerSeconds: 60,
    hasImageOptions: false,
    optionImageUrls: ['', '', '', ''],
    questionImageUrl: ''
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const questionImageRef = useRef(null);
  const optionImageRefs = useRef([]);

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm(prev => ({ ...prev, options: newOptions }));
  };

  const uploadQuestionImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
      const storageRef = ref(storage, `questions/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateField('questionImageUrl', url);
      toast('Görsel yüklendi', 'success');
    } catch (e) {
      console.error('Upload error:', e);
      toast('Görsel yüklenirken hata oluştu', 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadOptionImage = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL } = window.firebase;
      const storageRef = ref(storage, `options/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const newUrls = [...form.optionImageUrls];
      newUrls[index] = url;
      setForm(prev => ({ ...prev, optionImageUrls: newUrls }));
      toast('Seçenek görseli yüklendi', 'success');
    } catch (e) {
      console.error('Upload error:', e);
      toast('Görsel yüklenirken hata oluştu', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    const validationErrors = validateQuestion(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast('Lütfen tüm gerekli alanları doldurun', 'error');
      return;
    }

    setSaving(true);
    try {
      await waitFirebase();
      const { db, collection, addDoc, serverTimestamp } = window.firebase;

      const suggestion = {
        ...form,
        status: 'pending', // pending, approved, rejected
        suggestedBy: {
          uid: currentUser.uid,
          email: currentUser.email,
          name: `${currentUser.firstName} ${currentUser.lastName}`
        },
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'suggestedQuestions'), suggestion);
      toast('Soru öneriniz gönderildi! Teşekkürler 🎉', 'success');

      // Reset form
      setForm({
        questionText: '',
        type: 'mcq',
        category: '',
        difficulty: 'medium',
        options: ['', '', '', ''],
        correctAnswer: '',
        hasTimer: false,
        timerSeconds: 60,
        hasImageOptions: false,
        optionImageUrls: ['', '', '', ''],
        questionImageUrl: ''
      });
      setErrors({});

      // Clear file inputs
      if (questionImageRef.current) questionImageRef.current.value = '';
      optionImageRefs.current.forEach(ref => {
        if (ref) ref.value = '';
      });

    } catch (e) {
      console.error('Submit error:', e);
      toast('Soru önerisi gönderilirken hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      title="💡 Soru Öner"
      subtitle="Soru havuzuna katkıda bulunun!"
    >
      <div className="card p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>📝 Not:</strong> Önerdiğiniz sorular admin tarafından incelendikten sonra soru havuzuna eklenecektir.
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-dark-700">Soru Metni *</label>
          <textarea
            className={`field min-h-[100px] ${errors.questionText ? 'border-red-500' : ''}`}
            value={form.questionText}
            onChange={e => updateField('questionText', e.target.value)}
            placeholder="Soru metnini giriniz..."
          ></textarea>
          {errors.questionText && <div className="text-red-600 text-sm mt-1">{errors.questionText}</div>}
        </div>

        {/* Question Image */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-dark-700">Soru Görseli (İsteğe Bağlı)</label>
          <input
            ref={questionImageRef}
            type="file"
            accept="image/*"
            onChange={uploadQuestionImage}
            className="field"
            disabled={uploading}
          />
          {form.questionImageUrl && (
            <div className="mt-2">
              <img src={form.questionImageUrl} alt="Question" className="max-w-xs rounded-lg border" />
            </div>
          )}
        </div>

        {/* Type, Category, Difficulty */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-dark-700">Tip *</label>
            <select
              className="field"
              value={form.type}
              onChange={e => updateField('type', e.target.value)}
            >
              <option value="mcq">Çoktan Seçmeli</option>
              <option value="open">Klasik (Serbest Yanıt)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-dark-700">Kategori *</label>
            <input
              className={`field ${errors.category ? 'border-red-500' : ''}`}
              value={form.category}
              onChange={e => updateField('category', e.target.value)}
              placeholder="Ürün Bilgisi"
            />
            {errors.category && <div className="text-red-600 text-sm mt-1">{errors.category}</div>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-dark-700">Zorluk *</label>
            <select
              className="field"
              value={form.difficulty}
              onChange={e => updateField('difficulty', e.target.value)}
            >
              <option value="easy">Kolay</option>
              <option value="medium">Orta</option>
              <option value="hard">Zor</option>
            </select>
          </div>
        </div>

        {/* MCQ Options */}
        {form.type === 'mcq' && (
          <>
            {/* Image Options Toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasImageOptions}
                  onChange={e => updateField('hasImageOptions', e.target.checked)}
                />
                <span className="text-sm font-semibold text-dark-700">Görsel Seçenekler Kullan</span>
              </label>
            </div>

            {!form.hasImageOptions ? (
              <>
                {/* Text Options */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-dark-700">Seçenekler * (En az 2)</label>
                  <div className="space-y-2">
                    {form.options.map((o, i) => (
                      <input
                        key={i}
                        className={`field ${errors.options ? 'border-red-500' : ''}`}
                        value={o}
                        onChange={e => updateOption(i, e.target.value)}
                        placeholder={`Seçenek ${i + 1}`}
                      />
                    ))}
                  </div>
                  {errors.options && <div className="text-red-600 text-sm mt-1">{errors.options}</div>}
                </div>

                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-dark-700">Doğru Cevap *</label>
                  <select
                    className={`field ${errors.correctAnswer ? 'border-red-500' : ''}`}
                    value={form.correctAnswer}
                    onChange={e => updateField('correctAnswer', e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {form.options.filter(o => o.trim()).map((o, i) => (
                      <option key={i} value={o}>{o}</option>
                    ))}
                  </select>
                  {errors.correctAnswer && <div className="text-red-600 text-sm mt-1">{errors.correctAnswer}</div>}
                </div>
              </>
            ) : (
              <>
                {/* Image Options */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-dark-700">Seçenek Görselleri *</label>
                  <div className="grid grid-cols-2 gap-4">
                    {form.options.map((o, i) => (
                      <div key={i} className="space-y-2">
                        <input
                          className="field"
                          value={o}
                          onChange={e => updateOption(i, e.target.value)}
                          placeholder={`Etiket ${i + 1}`}
                        />
                        <input
                          ref={el => optionImageRefs.current[i] = el}
                          type="file"
                          accept="image/*"
                          onChange={e => uploadOptionImage(i, e)}
                          className="field"
                          disabled={uploading}
                        />
                        {form.optionImageUrls[i] && (
                          <img src={form.optionImageUrls[i]} alt={`Option ${i + 1}`} className="w-full rounded-lg border" />
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.options && <div className="text-red-600 text-sm mt-1">{errors.options}</div>}
                </div>

                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-dark-700">Doğru Cevap *</label>
                  <select
                    className={`field ${errors.correctAnswer ? 'border-red-500' : ''}`}
                    value={form.correctAnswer}
                    onChange={e => updateField('correctAnswer', e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {form.options.filter(o => o.trim()).map((o, i) => (
                      <option key={i} value={o}>{o}</option>
                    ))}
                  </select>
                  {errors.correctAnswer && <div className="text-red-600 text-sm mt-1">{errors.correctAnswer}</div>}
                </div>
              </>
            )}
          </>
        )}

        {/* Timer */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.hasTimer}
              onChange={e => updateField('hasTimer', e.target.checked)}
            />
            <span className="text-sm font-semibold text-dark-700">Süre Sınırı Ekle</span>
          </label>
          {form.hasTimer && (
            <div className="mt-2">
              <input
                type="number"
                className="field"
                value={form.timerSeconds}
                onChange={e => updateField('timerSeconds', parseInt(e.target.value) || 60)}
                min="10"
                max="600"
              />
              <div className="text-xs text-dark-500 mt-1">Saniye cinsinden (10-600)</div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <button
            className="btn btn-primary flex-1"
            onClick={handleSubmit}
            disabled={saving || uploading}
          >
            {saving ? 'Gönderiliyor...' : '📤 Soru Öner'}
          </button>
        </div>
      </div>
    </Page>
  );
};

window.SuggestQuestion = SuggestQuestion;
