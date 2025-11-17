const { useState, useEffect, useRef } = React;

const Branding = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [searchPlaceholderWords, setSearchPlaceholderWords] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]); // Array of {id, name}
  const [selectedCompany, setSelectedCompany] = useState('');
  const fileInputRef = useRef(null);

  const currentUser = getCurrentUser();
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.isSuperAdmin === true;
  const isSuperAdminUser = currentUser?.isSuperAdmin === true;

  // Load company - admin can only manage their own company, super admin can manage all
  useEffect(() => {
    const loadCompanies = async () => {
      await waitFirebase();
      try {
        if (isSuperAdminUser) {
          // Super admin: Load all companies from companies collection
          const { db, collection, getDocs, query, orderBy } = window.firebase;
          const q = query(collection(db, 'companies'), orderBy('name'));
          const snapshot = await getDocs(q);
          const companiesList = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.id
          }));

          console.log('🏢 Companies loaded:', companiesList);
          setCompanies(companiesList);

          // Also check what's in branding collection
          const brandingSnapshot = await getDocs(collection(db, 'branding'));
          console.log('🎨 Branding documents:', brandingSnapshot.docs.map(d => ({
            id: d.id,
            company: d.data().company,
            hasLogo: !!d.data().logoUrl,
            hasPlaceholder: !!d.data().searchPlaceholderWords
          })));

          // Use selected company from getSelectedCompany()
          const selectedComp = getSelectedCompany();
          console.log('📍 Selected company from localStorage:', selectedComp);
          if (selectedComp && selectedComp !== 'all') {
            const found = companiesList.find(c => c.id === selectedComp);
            if (found) {
              console.log('✅ Found matching company:', found);
              setSelectedCompany(found.id);
            } else {
              console.log('⚠️ No matching company found for:', selectedComp);
              console.log('⚠️ Available companies:', companiesList.map(c => c.id));
              if (companiesList.length > 0) {
                console.log('📌 Defaulting to first company:', companiesList[0]);
                setSelectedCompany(companiesList[0].id);
              }
            }
          } else {
            console.log('📌 No selection or "all", defaulting to first company');
            if (companiesList.length > 0) {
              console.log('📌 First company:', companiesList[0]);
              setSelectedCompany(companiesList[0].id);
            }
          }
        } else if (currentUser?.company) {
          // Regular admin: Only their company
          const displayName = currentUser.companyName || currentUser.company;
          setCompanies([{ id: currentUser.company, name: displayName }]);
          setSelectedCompany(currentUser.company);
        }
      } catch (e) {
        window.devError('Companies load error:', e);
      }
    };

    loadCompanies();
  }, []);

  // Super admin: Listen for company changes (separate effect to access companies state)
  useEffect(() => {
    if (!isSuperAdminUser) return;

    const handleCompanyChange = () => {
      const selectedComp = getSelectedCompany();
      if (selectedComp && selectedComp !== 'all') {
        setSelectedCompany(selectedComp);
      } else if (selectedComp === 'all' && companies.length > 0) {
        // If "All Companies" selected, default to first company
        // (Branding must be per-company, cannot show "all")
        setSelectedCompany(companies[0].id);
      }
    };

    window.addEventListener('company-changed', handleCompanyChange);
    return () => window.removeEventListener('company-changed', handleCompanyChange);
  }, [companies, isSuperAdminUser]);

  // Load branding settings when company changes
  useEffect(() => {
    if (!selectedCompany) return;

    (async () => {
      setLoading(true);
      await waitFirebase();
      try {
        const { db, doc, getDoc } = window.firebase;

        // Try to find company info (ID and name) for backward compatibility
        console.log('🔍 Branding Load Debug:', {
          selectedCompany: selectedCompany,
          companiesAvailable: companies,
          companiesLength: companies.length
        });

        const companyInfo = companies.find(c => c.id === selectedCompany);
        const companyName = companyInfo?.name || selectedCompany;

        console.log(`📂 Loading branding for:`, {
          selectedCompany: selectedCompany,
          companyInfo: companyInfo,
          companyName: companyName
        });

        // Try loading with NAME first (current system), then with ID (fallback)
        console.log(`🔎 Trying to load: doc(db, 'branding', '${companyName}')`);
        let brandingDoc = await getDoc(doc(db, 'branding', companyName));
        console.log(`📄 Result with name "${companyName}":`, brandingDoc.exists() ? 'EXISTS' : 'NOT FOUND');

        // If not found with name, try with ID (backward compatibility)
        if (!brandingDoc.exists() && companyName !== selectedCompany) {
          console.log(`🔎 Trying to load: doc(db, 'branding', '${selectedCompany}')`);
          brandingDoc = await getDoc(doc(db, 'branding', selectedCompany));
          console.log(`📄 Result with ID "${selectedCompany}":`, brandingDoc.exists() ? 'EXISTS' : 'NOT FOUND');
        }

        if (brandingDoc.exists()) {
          const data = brandingDoc.data();
          console.log(`✅ Branding loaded:`, {
            docId: brandingDoc.id,
            logoUrl: data?.logoUrl?.substring(0, 50) + '...',
            searchPlaceholderWords: data?.searchPlaceholderWords
          });
          setLogoUrl(data?.logoUrl || '');
          setSearchPlaceholderWords(data?.searchPlaceholderWords || '');
        } else {
          // Reset to defaults if no settings exist for this company
          console.log(`❌ No branding found for:`, {
            selectedCompanyId: selectedCompany,
            companyName: companyName,
            triedPaths: [`branding/${companyName}`, `branding/${selectedCompany}`]
          });
          setLogoUrl('');
          setSearchPlaceholderWords('');
        }
      } catch (e) {
        window.devError('Settings load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCompany, companies]);

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

      // Get company name for backward compatibility
      const companyInfo = companies.find(c => c.id === selectedCompany);
      const companyName = companyInfo?.name || selectedCompany;

      // Upload to Firebase Storage with company-specific path (use name for consistency)
      const storageRef = ref(storage, `branding/${companyName}/logo_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Save URL to Firestore branding collection (use name as document ID for backward compatibility)
      await setDoc(doc(db, 'branding', companyName), {
        company: companyName,
        companyId: selectedCompany, // Also save ID for reference
        logoUrl: url,
        searchPlaceholderWords: searchPlaceholderWords,
        updatedAt: new Date()
      });

      console.log(`Branding saved for company "${companyName}" (ID: ${selectedCompany})`);


      window.devLog('Logo uploaded successfully for', companyName, ':', url);
      setLogoUrl(url);
      toast(`${companyName} için logo başarıyla yüklendi`, 'success');

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

      // Get company name for backward compatibility
      const companyInfo = companies.find(c => c.id === selectedCompany);
      const companyName = companyInfo?.name || selectedCompany;

      await setDoc(doc(db, 'branding', companyName), {
        company: companyName,
        companyId: selectedCompany,
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

      // Get company name for backward compatibility
      const companyInfo = companies.find(c => c.id === selectedCompany);
      const companyName = companyInfo?.name || selectedCompany;

      await setDoc(doc(db, 'branding', companyName), {
        company: companyName,
        companyId: selectedCompany,
        logoUrl: logoUrl,
        searchPlaceholderWords: searchPlaceholderWords,
        updatedAt: new Date()
      });

      toast(`${companyName} için arama placeholder kelimeleri kaydedildi`, 'success');
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
                    <option key={company.id} value={company.id}>{company.name}</option>
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
