const { useState, useEffect, useRef } = React;

const Branding = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [searchPlaceholderWords, setSearchPlaceholderWords] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const fileInputRef = useRef(null);

  const currentUser = getCurrentUser();
  const isAdminUser = currentUser?.role === 'admin';

  // Load company - admin can only manage their own company (multi-tenant isolation)
  useEffect(() => {
    (async () => {
      await waitFirebase();
      try {
        // 🔒 Her admin sadece kendi şirketinin branding'ini yönetir
        if (currentUser?.company) {
          setCompanies([currentUser.company]);
          setSelectedCompany(currentUser.company);
        }
      } catch (e) {
        window.devError('Companies load error:', e);
      }
    })();
  }, []);

  // Load branding settings when company changes
  useEffect(() => {
    if (!selectedCompany) return;

    (async () => {
      setLoading(true);
      await waitFirebase();
      try {
        const { db, doc, getDoc } = window.firebase;
        const brandingDoc = await getDoc(doc(db, 'branding', selectedCompany));
        if (brandingDoc.exists()) {
          const data = brandingDoc.data();
          setLogoUrl(data?.logoUrl || '');
          setSearchPlaceholderWords(data?.searchPlaceholderWords || '');
        } else {
          // Reset to defaults if no settings exist for this company
          setLogoUrl('');
          setSearchPlaceholderWords('');
        }
      } catch (e) {
        window.devError('Settings load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCompany]);

  const handleFileSelect = (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast('Lütfen bir resim dosyası seçin', 'error');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast('Dosya boyutu en fazla 2MB olabilir', 'error');
      return;
    }
    
    uploadLogo(file);
  };

  const uploadLogo = async (file) => {
    if (!selectedCompany) {
      toast('Lütfen önce bir şirket seçin', 'error');
      return;
    }

    setUploading(true);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL, db, doc, setDoc } = window.firebase;

      // Upload to Firebase Storage with company-specific path
      const storageRef = ref(storage, `branding/${selectedCompany}/logo_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Save URL to Firestore branding collection
      await setDoc(doc(db, 'branding', selectedCompany), {
        company: selectedCompany,
        logoUrl: url,
        searchPlaceholderWords: searchPlaceholderWords,
        updatedAt: new Date()
      });

      window.devLog('Logo uploaded successfully for', selectedCompany, ':', url);
      setLogoUrl(url);
      toast(`${selectedCompany} için logo başarıyla yüklendi`, 'success');

      // Reload page to update logo everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      window.devError('Upload error:', e);
      toast('Logo yüklenirken hata oluştu', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteLogo = async () => {
    if (!selectedCompany) {
      toast('Lütfen önce bir şirket seçin', 'error');
      return;
    }

    if (!confirm('Logo\'yu silmek istediğinizden emin misiniz?')) return;

    try {
      await waitFirebase();
      const { db, doc, setDoc } = window.firebase;

      await setDoc(doc(db, 'branding', selectedCompany), {
        company: selectedCompany,
        logoUrl: '',
        searchPlaceholderWords: searchPlaceholderWords,
        updatedAt: new Date()
      });

      setLogoUrl('');
      toast('Logo silindi', 'success');
    } catch (e) {
      window.devError('Delete error:', e);
      toast('Logo silinirken hata oluştu', 'error');
    }
  };

  const saveSearchPlaceholderWords = async () => {
    if (!selectedCompany) {
      toast('Lütfen önce bir şirket seçin', 'error');
      return;
    }

    setSaving(true);
    try {
      await waitFirebase();
      const { db, doc, setDoc } = window.firebase;

      await setDoc(doc(db, 'branding', selectedCompany), {
        company: selectedCompany,
        logoUrl: logoUrl,
        searchPlaceholderWords: searchPlaceholderWords,
        updatedAt: new Date()
      });

      toast(`${selectedCompany} için arama placeholder kelimeleri kaydedildi`, 'success');
    } catch (e) {
      window.devError('Save error:', e);
      toast('Kaydetme sırasında hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  if (loading && !selectedCompany) return <Page title="Marka Ayarları"><LoadingSpinner text="Yükleniyor..." /></Page>;

  return (
    <Page title="Marka Ayarları" subtitle="Logo ve marka görsellerinizi yönetin">
      <div className="max-w-4xl mx-auto">
        {/* Company Selector */}
        {companies.length > 0 && (
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-4">
              <BuildingOfficeIcon size={24} strokeWidth={2} className="text-primary-500 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-semibold mb-2 text-dark-700">
                  {isAdminUser ? 'Şirket Seçin' : 'Şirketiniz'}
                </label>
                <select
                  className="field w-full"
                  style={{ paddingRight: '2.5rem' }}
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  disabled={!isAdminUser || companies.length === 1}
                >
                  {companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
                <p className="text-xs text-dark-500 mt-1">
                  {isAdminUser
                    ? 'Seçilen şirkete ait marka ayarlarını düzenleyebilirsiniz.'
                    : 'Sadece kendi şirketinizin marka ayarlarını düzenleyebilirsiniz.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-dark-900 mb-4">Logo Yükle</h3>
            
            <div
              className="upload-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <LoadingSpinner text="Yükleniyor..." />
              ) : (
                <>
                  <div className="text-5xl mb-3">
                    <ArrowUpTrayIcon size={64} strokeWidth={1.5} className="inline text-primary-500" />
                  </div>
                  <p className="font-semibold text-dark-900 mb-1">
                    Dosya seçin veya sürükleyin
                  </p>
                  <p className="text-sm text-dark-600 mb-3">
                    PNG, JPG, SVG (Max 2MB)
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                  >
                    Dosya Seç
                  </button>
                </>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />

            <div className="mt-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
              <p className="text-sm text-dark-700 flex items-start gap-2">
                <LightBulbIcon size={18} strokeWidth={2} className="flex-shrink-0 text-primary-500 mt-0.5" />
                <span><b>İpucu:</b> Logo transparan arka plana sahip olmalı ve kare formatında olmalıdır (örn: 512x512px).</span>
              </p>
            </div>
          </div>

          {/* Preview Section */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-dark-900 mb-4">Önizleme</h3>
            
            {logoUrl ? (
              <>
                <div className="glass-brand-logo-card mx-auto mb-4">
                  <img src={logoUrl} alt="Logo Preview" />
                </div>
                <p className="text-sm text-dark-600 text-center mb-4">
                  Ana sayfada böyle görünecek
                </p>
                <button className="btn btn-danger w-full flex items-center justify-center gap-2" onClick={deleteLogo}>
                  <TrashIcon size={18} strokeWidth={2} />
                  Logo'yu Sil
                </button>
              </>
            ) : (
              <div className="glass-brand-logo-card mx-auto mb-4">
                <p className="text-dark-500 text-center">Logo yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Search Placeholder Settings */}
        <div className="card p-6 mt-6">
          <h3 className="headline-small text-dark-900 mb-2">Arama Placeholder Kelimeleri</h3>
          <p className="body-small text-dark-600 mb-4">
            Search placeholder'da görünecek kelimeleri buraya virgülle ayırarak yazın. Örneğin: <b>COLM, BM WATCH OCEANIC, NEVILLE</b>. Virgülle ayrılmış her kelime sırayla placeholder animasyonunda kullanılacaktır.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-dark-700">
              Placeholder Kelimeleri (virgülle ayırın)
            </label>
            <input
              type="text"
              className="field w-full body-medium"
              placeholder="COLM, BM WATCH OCEANIC, NEVILLE"
              value={searchPlaceholderWords}
              onChange={(e) => setSearchPlaceholderWords(e.target.value)}
            />
            <p className="text-xs text-dark-500 mt-1">
              Her kelime animasyonda sırayla yazılıp silinecektir.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={saveSearchPlaceholderWords}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="card p-4">
            <div className="flex gap-3">
              <div className="text-2xl">
                <CheckCircleIcon size={32} strokeWidth={1.5} className="text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-dark-900 mb-1">Önerilen Format</h4>
                <p className="text-sm text-dark-600">PNG veya SVG, transparan arka plan</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex gap-3">
              <div className="text-2xl">
                <PhotoIcon size={32} strokeWidth={1.5} className="text-primary-500" />
              </div>
              <div>
                <h4 className="font-semibold text-dark-900 mb-1">Önerilen Boyut</h4>
                <p className="text-sm text-dark-600">512x512px - 1024x1024px (Kare)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

window.Branding = Branding;
