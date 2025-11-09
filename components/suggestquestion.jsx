const { useState, useRef } = React;

const SuggestQuestion = () => {
  const currentUser = getCurrentUser();
  const isAnonymous = !currentUser || currentUser.isAnonymous;

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
    questionImageUrl: '',
    // For anonymous users
    suggestorName: ''
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

  const uploadQuestionImage = async (file) => {
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

  const uploadOptionImage = async (file, index) => {
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
    console.log('=== SUBMIT STARTED ===');
    console.log('Current User:', currentUser);
    console.log('Is Anonymous:', isAnonymous);
    console.log('Form Data:', form);

    // Validation
    const validationErrors = validateQuestion(form);
    console.log('Validation Errors:', validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast('Lütfen tüm gerekli alanları doldurun', 'error');
      return;
    }

    // Anonim kullanıcı validasyonu
    if (isAnonymous && !form.suggestorName?.trim()) {
      console.log('ERROR: Anonymous user name required');
      setErrors(prev => ({ ...prev, suggestorName: 'Ad soyad gereklidir' }));
      toast('Lütfen adınızı ve soyadınızı girin', 'error');
      return;
    }

    setSaving(true);
    try {
      console.log('Waiting for Firebase...');
      await waitFirebase();
      const { db, collection, addDoc, serverTimestamp } = window.firebase;
      console.log('Firebase ready');

      // 🆕 Otomatik şirket bilgisi ekle
      const userCompany = currentUser?.company || 'BLUEMINT';

      const suggestion = {
        questionText: form.questionText,
        type: form.type,
        category: form.category,
        difficulty: form.difficulty,
        options: form.options,
        correctAnswer: form.correctAnswer,
        hasTimer: form.hasTimer,
        timerSeconds: form.timerSeconds,
        hasImageOptions: form.hasImageOptions,
        optionImageUrls: form.optionImageUrls,
        questionImageUrl: form.questionImageUrl,
        status: 'pending', // pending, approved, rejected
        company: userCompany, // 🆕 Şirket bilgisi
        suggestedBy: isAnonymous ? {
          uid: null,
          email: null,
          name: form.suggestorName,
          isAnonymous: true
        } : {
          uid: currentUser.uid,
          email: currentUser.email,
          name: `${currentUser.firstName} ${currentUser.lastName}`,
          isAnonymous: false
        },
        createdAt: serverTimestamp()
      };

      console.log('Suggestion Object:', suggestion);
      console.log('Attempting to save to suggestedQuestions...');

      const docRef = await addDoc(collection(db, 'suggestedQuestions'), suggestion);

      console.log('SUCCESS! Document ID:', docRef.id);
      toast('Soru öneriniz gönderildi! Teşekkürler', 'success');

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
        questionImageUrl: '',
        suggestorName: isAnonymous ? form.suggestorName : ''
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
    <Page title="Soru Öner" subtitle="Soru havuzuna katkıda bulunun!">
      <div className="max-w-3xl mx-auto">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
          <strong><DocumentTextIcon size={16} strokeWidth={2} className="inline" /> Not:</strong> Önerdiğiniz sorular admin tarafından incelendikten sonra soru havuzuna eklenecektir.
        </div>

        {/* Anonymous User Info */}
        {isAnonymous && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold text-yellow-800 mb-3">İletişim Bilgileriniz</div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Adınız Soyadınız *</label>
              <input
                className={`field ${errors.suggestorName ? 'error' : ''}`}
                value={form.suggestorName}
                onChange={e => updateField('suggestorName', e.target.value)}
                placeholder="Ahmet Yılmaz"
              />
              {errors.suggestorName && <div className="error-text">{errors.suggestorName}</div>}
            </div>
          </div>
        )}

        {/* Main Form Card - Matching AdminForm */}
        <div className="card p-6 mb-6 space-y-4">
          <h3 className="text-xl font-bold text-dark-900">Yeni Soru Öner</h3>

          <div>
            <label className="block text-sm font-semibold mb-2 text-dark-700">Soru Metni *</label>
            <textarea
              className={`field min-h-[100px] ${errors.questionText ? 'error' : ''}`}
              value={form.questionText}
              onChange={e => updateField('questionText', e.target.value)}
              placeholder="Soru metnini giriniz..."
            ></textarea>
            {errors.questionText && <div className="error-text">{errors.questionText}</div>}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Tip *</label>
              <select className={`field ${errors.type ? 'error' : ''}`} value={form.type} onChange={e => updateField('type', e.target.value)}>
                <option value="mcq">Çoktan Seçmeli</option>
                <option value="open">Klasik (Serbest Yanıt)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Kategori *</label>
              <input
                className={`field ${errors.category ? 'error' : ''}`}
                value={form.category}
                onChange={e => updateField('category', e.target.value)}
                placeholder="Ürün Bilgisi"
              />
              {errors.category && <div className="error-text">{errors.category}</div>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Zorluk *</label>
              <select className={`field ${errors.difficulty ? 'error' : ''}`} value={form.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                <option value="easy">Kolay</option>
                <option value="medium">Orta</option>
                <option value="hard">Zor</option>
              </select>
            </div>
          </div>

          {form.type === 'mcq' && (
            <>
              {!form.hasImageOptions && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-dark-700">Seçenekler * (En az 2)</label>
                    <div className="space-y-2">
                      {form.options.map((o, i) => (
                        <input
                          key={i}
                          className={`field ${errors.options ? 'error' : ''}`}
                          value={o}
                          onChange={e => updateOption(i, e.target.value)}
                          placeholder={`Seçenek ${i + 1}`}
                        />
                      ))}
                    </div>
                    {errors.options && <div className="error-text">{errors.options}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-dark-700">Doğru Cevap *</label>
                    <select className={`field ${errors.correctAnswer ? 'error' : ''}`} value={form.correctAnswer} onChange={e => updateField('correctAnswer', e.target.value)}>
                      <option value="">Seçiniz</option>
                      {form.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                    </select>
                    {errors.correctAnswer && <div className="error-text">{errors.correctAnswer}</div>}
                  </div>
                </>
              )}

              {form.hasImageOptions && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-dark-700">Seçenek İsimleri * (Kısa etiketler)</label>
                    <p className="text-xs text-dark-500 mb-2">Her görsel için kısa bir isim verin (örn: "A", "B", "C" veya "Seçenek 1")</p>
                    <div className="grid grid-cols-2 gap-2">
                      {form.options.map((o, i) => (
                        <input
                          key={i}
                          className="field"
                          value={o}
                          onChange={e => updateOption(i, e.target.value)}
                          placeholder={`Etiket ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-dark-700">Doğru Cevap *</label>
                    <select className={`field ${errors.correctAnswer ? 'error' : ''}`} value={form.correctAnswer} onChange={e => updateField('correctAnswer', e.target.value)}>
                      <option value="">Seçiniz</option>
                      {form.options.filter(o => o.trim()).map((o, i) => <option key={i} value={o}>{o}</option>)}
                    </select>
                    {errors.correctAnswer && <div className="error-text">{errors.correctAnswer}</div>}
                  </div>
                </>
              )}
            </>
          )}

          {/* TIMER SECTION - Matching AdminForm */}
          <div className="card p-4 bg-secondary-50 border border-secondary-200">
            <div className="flex items-center gap-3 mb-3">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.hasTimer}
                  onChange={e => updateField('hasTimer', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="font-semibold text-dark-900 flex items-center gap-1">
                <ClockIcon size={18} strokeWidth={2} /> Süre Sınırı Ekle
              </span>
            </div>

            {form.hasTimer && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-dark-700">Süre (saniye)</label>
                <input
                  type="number"
                  className="field"
                  value={form.timerSeconds}
                  onChange={e => updateField('timerSeconds', e.target.value)}
                  placeholder="60"
                  min="10"
                  max="300"
                />
                <p className="text-xs text-dark-500 mt-1">Önerilen: 30-120 saniye arası</p>
              </div>
            )}
          </div>

          {/* IMAGE SECTION - Matching AdminForm */}
          <div className="card p-4 bg-primary-50 border border-primary-200">
            <h4 className="font-bold text-dark-900 mb-3">Görsel Ekle</h4>

            {/* Question Image */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-dark-700">Soru Görseli</label>
                {form.questionImageUrl && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={() => updateField('questionImageUrl', '')}
                  >
                    <XMarkIcon size={16} strokeWidth={2} className="inline" /> Kaldır
                  </button>
                )}
              </div>
              {form.questionImageUrl ? (
                <div className="question-image-container max-w-md mx-auto">
                  <img src={form.questionImageUrl} alt="Soru" />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost w-full"
                    onClick={() => questionImageRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Yükleniyor...' : 'Görsel Yükle'}
                  </button>
                  <input
                    ref={questionImageRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadQuestionImage(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </>
              )}
            </div>

            {/* Option Images (Only for MCQ) */}
            {form.type === 'mcq' && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={form.hasImageOptions}
                      onChange={e => updateField('hasImageOptions', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className="text-sm font-semibold text-dark-700">Seçeneklerde Görsel Kullan</span>
                </div>

                {form.hasImageOptions && (
                  <div className="grid grid-cols-2 gap-3">
                    {form.options.map((o, i) => o.trim() && (
                      <div key={i} className="space-y-2">
                        <label className="text-xs font-semibold text-dark-700">Seçenek {i + 1}</label>
                        {form.optionImageUrls[i] ? (
                          <div className="relative">
                            <div className="question-image-container">
                              <img
                                src={form.optionImageUrls[i]}
                                alt={`Seçenek ${i + 1}`}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                            </div>
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                              onClick={() => {
                                const newUrls = [...form.optionImageUrls];
                                newUrls[i] = '';
                                updateField('optionImageUrls', newUrls);
                              }}
                            >
                              <XMarkIcon size={16} strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-ghost w-full text-xs py-2"
                              onClick={() => optionImageRefs.current[i]?.click()}
                              disabled={uploading}
                            >
                              Yükle
                            </button>
                            <input
                              ref={el => optionImageRefs.current[i] = el}
                              type="file"
                              accept="image/*"
                              onChange={(e) => uploadOptionImage(e.target.files[0], i)}
                              style={{ display: 'none' }}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || uploading}>
              {saving ? 'Gönderiliyor...' : 'Soru Öner'}
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
};

window.SuggestQuestion = SuggestQuestion;
