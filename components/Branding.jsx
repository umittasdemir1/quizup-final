const { useState, useEffect, useRef } = React;

const Branding = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      await waitFirebase();
      try {
        const { db, doc, getDoc } = window.firebase;
        const settingsDoc = await getDoc(doc(db, 'settings', 'branding'));
        if (settingsDoc.exists()) {
          setLogoUrl(settingsDoc.data()?.logoUrl || '');
        }
      } catch (e) {
        console.error('Settings load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
    setUploading(true);
    try {
      await waitFirebase();
      const { storage, ref, uploadBytes, getDownloadURL, db, doc, setDoc } = window.firebase;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `branding/logo_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Save URL to Firestore
      await setDoc(doc(db, 'settings', 'branding'), {
        logoUrl: url,
        updatedAt: new Date()
      });
      
      console.log('Logo uploaded successfully:', url);
      setLogoUrl(url);
      toast('Logo başarıyla yüklendi', 'success');
      
      // Reload page to update logo everywhere
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error('Upload error:', e);
      toast('Logo yüklenirken hata oluştu', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteLogo = async () => {
    if (!confirm('Logo\'yu silmek istediğinizden emin misiniz?')) return;
    
    try {
      await waitFirebase();
      const { db, doc, setDoc } = window.firebase;
      
      await setDoc(doc(db, 'settings', 'branding'), {
        logoUrl: '',
        updatedAt: new Date()
      });
      
      setLogoUrl('');
      toast('Logo silindi', 'success');
    } catch (e) {
      console.error('Delete error:', e);
      toast('Logo silinirken hata oluştu', 'error');
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

  if (loading) return <Page title="Marka Ayarları"><LoadingSpinner text="Yükleniyor..." /></Page>;

  return (
    <Page title="Marka Ayarları" subtitle="Logo ve marka görsellerinizi yönetin">
      <div className="max-w-4xl mx-auto">
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
                  <div className="text-5xl mb-3">📤</div>
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
              <p className="text-sm text-dark-700">
                <b>💡 İpucu:</b> Logo transparan arka plana sahip olmalı ve kare formatında olmalıdır (örn: 512x512px).
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
                <button className="btn btn-danger w-full" onClick={deleteLogo}>
                  🗑️ Logo'yu Sil
                </button>
              </>
            ) : (
              <div className="glass-brand-logo-card mx-auto mb-4">
                <p className="text-dark-500 text-center">Logo yok</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="card p-4">
            <div className="flex gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <h4 className="font-semibold text-dark-900 mb-1">Önerilen Format</h4>
                <p className="text-sm text-dark-600">PNG veya SVG, transparan arka plan</p>
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex gap-3">
              <div className="text-2xl">📐</div>
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
