const { useState, useEffect, useRef, useMemo } = React;

const Manager = () => {
  const [sessions, setSessions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employee: { fullName: '', store: '' }, questionIds: [] });
  const [errors, setErrors] = useState({});
  const [qrUrl, setQrUrl] = useState('');
  const qrRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    types: [],
    timers: []
  });
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('order-asc');
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const animatedPlaceholder = useAnimatedPlaceholder();

  // 📦 Question Packages State
  const [packages, setPackages] = useState([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [packageForm, setPackageForm] = useState({ name: '', questionIds: [] });
  const [packageErrors, setPackageErrors] = useState({});
  const [packageSearch, setPackageSearch] = useState('');
  const [packageFilters, setPackageFilters] = useState({
    categories: [],
    difficulties: [],
    types: [],
    timers: []
  });
  const [packageSort, setPackageSort] = useState('order-asc');
  const [showPackageFilters, setShowPackageFilters] = useState(false);
  const [showPackageSort, setShowPackageSort] = useState(false);
  const packageFilterRef = useRef(null);
  const packageSortRef = useRef(null);

  useEffect(() => {
    let unsubSessions, unsubQuestions;

    const loadData = async () => {
      await waitFirebase();
      const { db, collection, query, orderBy, onSnapshot, where } = window.firebase;

      // 🔒 Super admin seçtiği şirkete göre, admin kendi şirketini görür
      const currentUser = getCurrentUser();

      // Logout sırasında query çalıştırma
      if (!currentUser) return;

      // Get company identifiers for backward compatibility (checks both ID and name)
      const companyIdentifiers = getCompanyIdentifiersForQuery();

      let qSessions, qQuestions;
      if (companyIdentifiers === null) {
        qSessions = query(
          collection(db, 'quizSessions'),
          orderBy('createdAt', 'desc')
        );
        qQuestions = query(
          collection(db, 'questions'),
          where('isActive', '==', true)
        );
      } else if (companyIdentifiers.length === 0) {
        // No company assigned - no data to show
        setSessions([]);
        setQuestions([]);
        return;
      } else {
        // Filter by company (checks both ID and name for backward compatibility)
        qSessions = query(
          collection(db, 'quizSessions'),
          where('company', 'in', companyIdentifiers),
          orderBy('createdAt', 'desc')
        );
        qQuestions = query(
          collection(db, 'questions'),
          where('company', 'in', companyIdentifiers),
          where('isActive', '==', true)
        );
      }

      unsubSessions = onSnapshot(qSessions, snap => {
        setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        // Logout sırasında permission hatası gösterme
        if (getCurrentUser()) {
          window.devError('Error loading sessions:', error);
          toast('Oturumlar yüklenirken hata oluştu', 'error');
        }
      });

      unsubQuestions = onSnapshot(qQuestions, snap => {
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
        // Logout sırasında permission hatası gösterme
        if (getCurrentUser()) {
          window.devError('Error loading questions:', error);
          toast('Sorular yüklenirken hata oluştu', 'error');
        }
        setLoading(false);
      });
    };

    loadData();

    const handleCompanyChange = () => {
      if (unsubSessions) unsubSessions();
      if (unsubQuestions) unsubQuestions();
      setLoading(true);
      loadData();
    };

    window.addEventListener('company-changed', handleCompanyChange);

    return () => {
      if (unsubSessions) unsubSessions();
      if (unsubQuestions) unsubQuestions();
      window.removeEventListener('company-changed', handleCompanyChange);
    };
  }, []);

  // 📦 Load Question Packages - Realtime listener
  useEffect(() => {
    let unsubscribe;

    const loadPackages = async () => {
      try {
        await waitFirebase();
        const { db, collection, query, where, onSnapshot } = window.firebase;

        const currentUser = getCurrentUser();
        if (!currentUser) {
          console.warn('⚠️ No user found, packages not loaded');
          return;
        }

        const selectedCompany = getSelectedCompany();
        const isSuperAdminUser = currentUser?.isSuperAdmin === true;
        const isUserAdmin = currentUser?.role === 'admin' || isSuperAdminUser;

        console.log('📦 Setting up package listener for:', {
          selectedCompany,
          role: currentUser.role,
          isAdmin: isUserAdmin,
          isSuperAdmin: isSuperAdminUser,
          uid: currentUser.uid
        });

        // Super Admin (all companies): Tüm paketleri görebilir
        // Super Admin (specific company): Şirketin paketlerini görebilir
        // Admin: Tüm şirket paketlerini görebilir
        // Manager: Sadece kendi paketlerini görebilir

        // Get company identifiers for backward compatibility
        const companyIdentifiers = getCompanyIdentifiersForQuery();

        let q;
        if (companyIdentifiers === null) {
          // Super Admin: All companies
          q = query(collection(db, 'questionPackages'));
        } else if (companyIdentifiers.length === 0) {
          // No company - no packages
          setPackages([]);
          return;
        } else {
          // Filter by company (checks both ID and name)
          if (isUserAdmin) {
            q = query(
              collection(db, 'questionPackages'),
              where('company', 'in', companyIdentifiers)
            );
          } else {
            q = query(
              collection(db, 'questionPackages'),
              where('company', 'in', companyIdentifiers),
              where('createdBy', '==', currentUser.uid)
            );
          }
        }

        // Realtime listener - auto-updates on changes
        unsubscribe = onSnapshot(q,
          (snapshot) => {
            // Client-side sort by createdAt
            const packagesData = snapshot.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

            setPackages(packagesData);
            console.log('📦 Packages loaded:', packagesData.length, '(admin:', isUserAdmin, ')');

            // Debug: Show first package data
            if (packagesData.length > 0) {
              console.log('📦 First package sample:', {
                name: packagesData[0].name,
                createdByName: packagesData[0].createdByName,
                createdByRole: packagesData[0].createdByRole,
                company: packagesData[0].company,
                questionCount: packagesData[0].questionCount
              });
            }
          },
          (error) => {
            // Don't show error during logout
            if (getCurrentUser()) {
              console.error('❌ Load packages error:', error);
              window.devError('Load packages error:', error);
            }
          }
        );
      } catch (e) {
        console.error('❌ Load packages setup error:', e);
        window.devError('Load packages setup error:', e);
      }
    };

    loadPackages();

    const handleCompanyChange = () => {
      if (unsubscribe) unsubscribe();
      loadPackages();
    };

    window.addEventListener('company-changed', handleCompanyChange);

    // Cleanup function
    return () => {
      if (unsubscribe) {
        console.log('🧹 Cleaning up package listener');
        unsubscribe();
      }
      window.removeEventListener('company-changed', handleCompanyChange);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('[data-question-filter-toggle]')) return;
      if (e.target.closest('[data-question-sort-toggle]')) return;
      if (e.target.closest('[data-package-filter-toggle]')) return;
      if (e.target.closest('[data-package-sort-toggle]')) return;

      if (showFilters && filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }

      if (showSort && sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSort(false);
      }

      if (showPackageFilters && packageFilterRef.current && !packageFilterRef.current.contains(e.target)) {
        setShowPackageFilters(false);
      }

      if (showPackageSort && packageSortRef.current && !packageSortRef.current.contains(e.target)) {
        setShowPackageSort(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, showSort, showPackageFilters, showPackageSort]);

  const orderMap = useMemo(() => {
    const map = new Map();
    questions.forEach((q, index) => {
      map.set(q.id, index);
    });
    return map;
  }, [questions]);

  const sortIdsByOrder = (ids) => {
    return [...ids].sort((a, b) => {
      const orderA = orderMap.get(a);
      const orderB = orderMap.get(b);
      if (orderA == null && orderB == null) return 0;
      if (orderA == null) return 1;
      if (orderB == null) return -1;
      return orderA - orderB;
    });
  };

  const uniqueCategories = useMemo(
    () => [...new Set(questions.map(q => q.category).filter(Boolean))].sort(),
    [questions]
  );

  const uniqueTypes = useMemo(
    () => [...new Set(questions.map(q => q.type).filter(Boolean))],
    [questions]
  );

  const difficulties = useMemo(() => ([
    { value: 'easy', label: 'Kolay' },
    { value: 'medium', label: 'Orta' },
    { value: 'hard', label: 'Zor' }
  ]), []);

  const sortOptions = useMemo(() => ([
    { value: 'order-asc', label: 'Numara (Artan)' },
    { value: 'order-desc', label: 'Numara (Azalan)' },
    { value: 'text-asc', label: 'Soru Metni (A → Z)' },
    { value: 'text-desc', label: 'Soru Metni (Z → A)' },
    { value: 'created-desc', label: 'Oluşturulma (Yeni → Eski)' },
    { value: 'created-asc', label: 'Oluşturulma (Eski → Yeni)' },
    { value: 'difficulty-easy', label: 'Zorluk (Kolay → Zor)' },
    { value: 'difficulty-hard', label: 'Zorluk (Zor → Kolay)' },
    { value: 'category-asc', label: 'Kategori (A → Z)' },
    { value: 'category-desc', label: 'Kategori (Z → A)' }
  ]), []);

  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  const clearFilters = () => {
    setFilters({ categories: [], difficulties: [], types: [], timers: [] });
  };

  const resetFilters = () => {
    setSearch('');
    clearFilters();
    setShowFilters(false);
  };

  const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.types.length + filters.timers.length;

  // 📦 Package modal filter helpers
  const togglePackageFilter = (type, value) => {
    setPackageFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  const clearPackageFilters = () => {
    setPackageFilters({ categories: [], difficulties: [], types: [], timers: [] });
  };

  const resetPackageFilters = () => {
    setPackageSearch('');
    clearPackageFilters();
    setShowPackageFilters(false);
  };

  const activePackageFilterCount = packageFilters.categories.length + packageFilters.difficulties.length + packageFilters.types.length + packageFilters.timers.length;

  const getDisplayOrder = (question, index) => (
    typeof question.order === 'number' ? question.order + 1 : index + 1
  );

  const toMillis = (ts) => {
    try {
      if (!ts) return 0;
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (typeof ts.toDate === 'function') return ts.toDate().getTime();
      if (typeof ts === 'number') return ts;
      if (ts.seconds) return (ts.seconds * 1000) + Math.round((ts.nanoseconds || 0) / 1e6);
      return new Date(ts).getTime() || 0;
    } catch (error) {
      return 0;
    }
  };

  const visibleQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const wantsTimed = filters.timers.includes('timed');
    const wantsUntimed = filters.timers.includes('untimed');

    const base = questions.map((q, index) => ({
      data: q,
      originalIndex: index,
      orderNumber: getDisplayOrder(q, index)
    }));

    const filtered = base.filter(({ data }) => {
      if (filters.categories.length > 0 && (!data.category || !filters.categories.includes(data.category))) {
        return false;
      }

      if (filters.difficulties.length > 0 && (!data.difficulty || !filters.difficulties.includes(data.difficulty))) {
        return false;
      }

      if (filters.types.length > 0 && (!data.type || !filters.types.includes(data.type))) {
        return false;
      }

      if (filters.timers.length > 0) {
        const isTimed = Boolean(data.hasTimer && Number(data.timerSeconds) > 0);
        if (wantsTimed && wantsUntimed) {
          // show all
        } else if (wantsTimed && !isTimed) {
          return false;
        } else if (wantsUntimed && isTimed) {
          return false;
        }
      }

      if (!term) {
        return true;
      }

      const haystack = [
        data.questionText,
        data.category,
        data.correctAnswer,
        ...(Array.isArray(data.options) ? data.options : [])
      ].filter(Boolean).map(item => String(item).toLowerCase());

      return haystack.some(text => text.includes(term));
    });

    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'order-desc':
          return b.orderNumber - a.orderNumber || a.originalIndex - b.originalIndex;
        case 'text-asc':
          return (a.data.questionText || '').localeCompare(b.data.questionText || '');
        case 'text-desc':
          return (b.data.questionText || '').localeCompare(a.data.questionText || '');
        case 'created-desc':
          return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
        case 'created-asc':
          return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
        case 'difficulty-easy':
          return (difficultyOrder[a.data.difficulty] || 2) - (difficultyOrder[b.data.difficulty] || 2);
        case 'difficulty-hard':
          return (difficultyOrder[b.data.difficulty] || 2) - (difficultyOrder[a.data.difficulty] || 2);
        case 'category-asc':
          return (a.data.category || '').localeCompare(b.data.category || '') || (a.orderNumber - b.orderNumber);
        case 'category-desc':
          return (b.data.category || '').localeCompare(a.data.category || '') || (a.orderNumber - b.orderNumber);
        case 'order-asc':
        default:
          return a.orderNumber - b.orderNumber || a.originalIndex - b.originalIndex;
      }
    });

    return sorted;
  }, [questions, filters, search, sortOption]);

  // 📦 Package Modal: Visible questions with independent filters
  const visiblePackageQuestions = useMemo(() => {
    const term = packageSearch.trim().toLowerCase();
    const wantsTimed = packageFilters.timers.includes('timed');
    const wantsUntimed = packageFilters.timers.includes('untimed');

    const base = questions.map((q, index) => ({
      data: q,
      originalIndex: index,
      orderNumber: getDisplayOrder(q, index)
    }));

    const filtered = base.filter(({ data }) => {
      if (packageFilters.categories.length > 0 && (!data.category || !packageFilters.categories.includes(data.category))) {
        return false;
      }

      if (packageFilters.difficulties.length > 0 && (!data.difficulty || !packageFilters.difficulties.includes(data.difficulty))) {
        return false;
      }

      if (packageFilters.types.length > 0 && (!data.type || !packageFilters.types.includes(data.type))) {
        return false;
      }

      if (packageFilters.timers.length > 0) {
        const isTimed = Boolean(data.hasTimer && Number(data.timerSeconds) > 0);
        if (wantsTimed && wantsUntimed) {
          // show all
        } else if (wantsTimed && !isTimed) {
          return false;
        } else if (wantsUntimed && isTimed) {
          return false;
        }
      }

      if (!term) {
        return true;
      }

      const haystack = [
        data.questionText,
        data.category,
        data.correctAnswer,
        ...(Array.isArray(data.options) ? data.options : [])
      ].filter(Boolean).map(item => String(item).toLowerCase());

      return haystack.some(text => text.includes(term));
    });

    const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };

    const sorted = [...filtered].sort((a, b) => {
      switch (packageSort) {
        case 'order-desc':
          return b.orderNumber - a.orderNumber || a.originalIndex - b.originalIndex;
        case 'text-asc':
          return (a.data.questionText || '').localeCompare(b.data.questionText || '');
        case 'text-desc':
          return (b.data.questionText || '').localeCompare(a.data.questionText || '');
        case 'created-desc':
          return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
        case 'created-asc':
          return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
        case 'difficulty-easy':
          return (difficultyOrder[a.data.difficulty] || 2) - (difficultyOrder[b.data.difficulty] || 2);
        case 'difficulty-hard':
          return (difficultyOrder[b.data.difficulty] || 2) - (difficultyOrder[a.data.difficulty] || 2);
        case 'category-asc':
          return (a.data.category || '').localeCompare(b.data.category || '') || (a.orderNumber - b.orderNumber);
        case 'category-desc':
          return (b.data.category || '').localeCompare(a.data.category || '') || (a.orderNumber - b.orderNumber);
        case 'order-asc':
        default:
          return a.orderNumber - b.orderNumber || a.originalIndex - b.originalIndex;
      }
    });

    return sorted;
  }, [questions, packageFilters, packageSearch, packageSort]);

  const reset = () => {
    setForm({ employee: { fullName: '', store: '' }, questionIds: [] });
    setShowForm(false);
    setQrUrl('');
    setErrors({});
    setFilters({ categories: [], difficulties: [], types: [], timers: [] });
    setSearch('');
  };

  const toggleQ = (id) => {
    const ids = [...form.questionIds];
    const idx = ids.indexOf(id);
    if (idx > -1) {
      ids.splice(idx, 1);
      setForm(f => ({ ...f, questionIds: ids }));
    } else {
      ids.push(id);
      const orderedIds = sortIdsByOrder(ids);
      setForm(f => ({ ...f, questionIds: orderedIds }));
    }
    if (errors.questions) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors.questions;
        return newErrors;
      });
    }
  };

  const selectAllQuestions = () => {
    // Select all filtered questions, not all questions
    const ids = visibleQuestions.map(({ data }) => data.id);
    setForm(f => ({ ...f, questionIds: sortIdsByOrder(ids) }));
    if (errors.questions) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors.questions;
        return newErrors;
      });
    }
  };

  const clearAllQuestions = () => {
    setForm(f => ({ ...f, questionIds: [] }));
  };

  const handleCreate = async () => {
    const validationErrors = validateSession(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast('Lütfen tüm zorunlu alanları doldurun', 'error');
      return;
    }

    setSaving(true);
    try {
      await waitFirebase();
      const { db, collection, addDoc, serverTimestamp, doc, getDoc } = window.firebase;

      const creatorUid = window.__firebaseCurrentUser?.uid || null;

      let creatorPin = '0000';
      try {
        const storedUser = getCurrentUser();
        if (storedUser?.applicationPin && /^\d{4}$/.test(storedUser.applicationPin)) {
          creatorPin = storedUser.applicationPin;
        }
      } catch (err) {
        window.devWarn('Yerel kullanıcı bilgisi okunamadı:', err);
      }

      if (creatorUid && typeof getDoc === 'function' && typeof doc === 'function') {
        try {
          const userSnapshot = await getDoc(doc(db, 'users', creatorUid));
          if (userSnapshot?.exists()) {
            const userData = userSnapshot.data() || {};
            if (userData.applicationPin && /^\d{4}$/.test(userData.applicationPin)) {
              creatorPin = userData.applicationPin;
            }
          }
        } catch (err) {
          window.devWarn('Oturum oluşturulurken kullanıcı PIN bilgisi alınamadı:', err);
        }
      }

      // Oturum açan kişinin şirket bilgisini al
      const currentUser = getCurrentUser();
      const userCompany = currentUser?.company || 'BLUEMINT';

      const data = {
        employee: {
          fullName: form.employee.fullName.trim(),
          store: form.employee.store.trim()
        },
        createdBy: creatorUid,
        createdByApplicationPin: creatorPin,
        company: userCompany, // 🆕 Otomatik şirket bilgisi
        questionIds: form.questionIds,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'quizSessions'), data);
      const url = location.origin + location.pathname + '#/quiz/' + ref.id;
      setQrUrl(url);
      
      setTimeout(() => {
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
          new QRCode(qrRef.current, { text: url, width: 200, height: 200 });
        }
      }, 100);
      
      toast('Quiz oturumu oluşturuldu', 'success');
    } catch(e) {
      window.devError('Create session error:', e);
      toast('Oturum oluşturulurken hata oluştu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu oturumu silmek istediğinizden emin misiniz?\n\nİlgili tüm test sonuçları da silinecektir.')) return;

    try {
      await waitFirebase();
      const { db, doc, deleteDoc, collection, query, where, getDocs } = window.firebase;

      // 🔒 Sadece kendi şirketinin sonuçlarını sil
      const currentUser = getCurrentUser();
      const userCompany = currentUser?.company || 'BLUEMINT';

      // First, delete all results associated with this session
      const resultsQuery = query(
        collection(db, 'results'),
        where('company', '==', userCompany),
        where('sessionId', '==', id)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      
      const deletePromises = resultsSnapshot.docs.map(resultDoc => 
        deleteDoc(doc(db, 'results', resultDoc.id))
      );
      
      await Promise.all(deletePromises);
      
      // Then delete the session itself
      await deleteDoc(doc(db, 'quizSessions', id));
      
      const deletedCount = resultsSnapshot.size;
      if (deletedCount > 0) {
        toast(`Oturum ve ${deletedCount} test sonucu silindi`, 'success');
      } else {
        toast('Oturum silindi', 'success');
      }
    } catch(e) {
      window.devError('Delete session error:', e);
      toast('Oturum silinirken hata oluştu: ' + e.message, 'error');
    }
  };

  const updateEmployee = (k, v) => {
    setForm(f => ({ ...f, employee: { ...f.employee, [k]: v } }));
    if (errors[k]) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors[k];
        return newErrors;
      });
    }
  };

  // 📦 Package Functions
  const openPackageModal = () => {
    setPackageForm({ name: '', questionIds: [] });
    setPackageErrors({});
    setPackageSearch('');
    setPackageFilters({ categories: [], difficulties: [], types: [], timers: [] });
    setPackageSort('order-asc');
    setShowPackageFilters(false);
    setShowPackageSort(false);
    setShowPackageModal(true);
  };

  const togglePackageQuestion = (questionId) => {
    setPackageForm(prev => {
      const isSelected = prev.questionIds.includes(questionId);
      return {
        ...prev,
        questionIds: isSelected
          ? prev.questionIds.filter(id => id !== questionId)
          : [...prev.questionIds, questionId]
      };
    });
  };

  const createPackage = async () => {
    // Validation
    const errors = {};
    if (!packageForm.name.trim()) {
      errors.name = 'Paket adı gereklidir';
    }
    if (packageForm.questionIds.length === 0) {
      errors.questionIds = 'En az 1 soru seçmelisiniz';
    }

    if (Object.keys(errors).length > 0) {
      setPackageErrors(errors);
      toast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    try {
      console.log('📦 Creating package...', {
        name: packageForm.name,
        questionCount: packageForm.questionIds.length
      });

      await waitFirebase();
      const { db, collection, addDoc, serverTimestamp } = window.firebase;

      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.uid) {
        console.error('❌ No current user found');
        toast('Kullanıcı oturumu bulunamadı', 'error');
        return;
      }

      const userCompany = currentUser?.company || 'BLUEMINT';
      console.log('📦 User info:', {
        uid: currentUser.uid,
        company: userCompany,
        name: currentUser.displayName || currentUser.email
      });

      // Get user full name
      const firstName = currentUser.firstName || '';
      const lastName = currentUser.lastName || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const createdByName = fullName || currentUser.displayName || currentUser.email || 'Bilinmeyen';

      const packageData = {
        name: packageForm.name.trim(),
        questionIds: packageForm.questionIds,
        questionCount: packageForm.questionIds.length,
        createdBy: currentUser.uid,
        createdByName: createdByName,
        createdByRole: currentUser.role || 'manager',
        company: userCompany,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      };

      console.log('📦 Package data:', packageData);
      console.log('👤 Creator info:', {
        firstName,
        lastName,
        fullName,
        createdByName,
        role: currentUser.role
      });
      const docRef = await addDoc(collection(db, 'questionPackages'), packageData);
      console.log('✅ Package created with ID:', docRef.id);

      // No manual reload needed - realtime listener will auto-update packages

      toast('Paket başarıyla oluşturuldu', 'success');
      setShowPackageModal(false);
      setPackageForm({ name: '', questionIds: [] });
      setPackageErrors({});
    } catch (e) {
      console.error('❌ Create package error:', e);
      console.error('Error code:', e.code);
      console.error('Error message:', e.message);
      console.error('Full error:', e);

      // More specific error messages
      let errorMessage = 'Paket oluşturulurken hata oluştu';
      if (e.code === 'permission-denied') {
        errorMessage = 'İzin hatası: Firestore kurallarını kontrol edin';
      } else if (e.code === 'unavailable') {
        errorMessage = 'Bağlantı hatası: İnternet bağlantınızı kontrol edin';
      } else if (e.message) {
        errorMessage = `Hata: ${e.message}`;
      }

      window.devError('Create package error:', e);
      toast(errorMessage, 'error');
    }
  };

  const deletePackage = async (packageId) => {
    if (!confirm('Bu paketi silmek istediğinizden emin misiniz?')) return;

    try {
      await waitFirebase();
      const { db, doc, deleteDoc } = window.firebase;

      await deleteDoc(doc(db, 'questionPackages', packageId));
      setPackages(prev => prev.filter(p => p.id !== packageId));

      // Eğer silinmiş paket seçiliyse, seçimi kaldır
      if (selectedPackageId === packageId) {
        setSelectedPackageId(null);
      }

      toast('Paket silindi', 'success');
    } catch (e) {
      window.devError('Delete package error:', e);
      toast('Paket silinirken hata oluştu', 'error');
    }
  };

  const selectPackage = (packageId) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    // Toggle: Eğer zaten seçili paket tıklanırsa, selection'ı kaldır
    if (selectedPackageId === packageId) {
      setSelectedPackageId(null);
      setForm(prev => ({ ...prev, questionIds: [] }));
    } else {
      setSelectedPackageId(packageId);
      // Paketin sorularını form'a yükle
      setForm(prev => ({ ...prev, questionIds: [...pkg.questionIds] }));
    }
  };

  if (loading) return <Page title="Manager Panel"><LoadingSpinner text="Veriler yükleniyor..." /></Page>;

  return (
    <Page 
      title="Manager Panel" 
      subtitle={`${sessions.length} oturum • ${questions.length} aktif soru`}
      extra={!showForm && !qrUrl && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Yeni Quiz</button>}
    >
      {qrUrl ? (
        <div className="card p-8 text-center space-y-6">
          <div className="inline-block p-6 bg-white rounded-2xl shadow-card">
            <div ref={qrRef}></div>
          </div>
          <div>
            <p className="font-semibold text-lg text-dark-900 mb-2">Quiz Hazır!</p>
            <p className="text-sm text-dark-600 mb-4">Personel bu QR kodu okutarak quize başlayabilir</p>
            <a href={qrUrl} target="_blank" className="text-primary-500 text-sm hover:underline break-all">{qrUrl}</a>
          </div>
          <button className="btn btn-primary" onClick={reset}>Yeni Quiz Oluştur</button>
        </div>
      ) : showForm ? (
        <div className="card p-6 space-y-6">
          <h3 className="text-xl font-bold text-dark-900">Yeni Quiz Oturumu</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Personel Adı *</label>
              <input 
                className={`field ${errors.fullName ? 'error' : ''}`}
                value={form.employee.fullName} 
                onChange={e => updateEmployee('fullName', e.target.value)}
                placeholder="Ümit TAŞDEMİR"
              />
              {errors.fullName && <div className="error-text">{errors.fullName}</div>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-dark-700">Mağaza *</label>
              <input 
                className={`field ${errors.store ? 'error' : ''}`}
                value={form.employee.store} 
                onChange={e => updateEmployee('store', e.target.value)}
                placeholder="Midtown"
              />
              {errors.store && <div className="error-text">{errors.store}</div>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-dark-700">
                Sorular Seç * ({form.questionIds.length} soru seçildi)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost text-xs px-3 py-1.5"
                  onClick={selectAllQuestions}
                  disabled={visibleQuestions.length === 0}
                >
                  Tümünü Seç
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs px-3 py-1.5"
                  onClick={clearAllQuestions}
                  disabled={form.questionIds.length === 0}
                >
                  Tümünü Kaldır
                </button>
              </div>
            </div>

            <div className="card p-4 mb-4">
              <div className="flex items-center gap-3">
                {/* Search Bar - Oval Design */}
                <div className="relative flex-1">
                  <span className="question-search-icon"><MagnifyingGlassIcon size={18} strokeWidth={2} /></span>
                  <input
                    type="search"
                    className="w-full pl-10 pr-4 py-3 border rounded-full bg-white body-medium focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                    placeholder={animatedPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      borderColor: '#E0E0E0'
                    }}
                  />
                </div>

                {/* Sort Button - Circular */}
                <div className="relative" ref={sortRef} title="Sırala">
                  <button
                    type="button"
                    className="p-3 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative"
                    onClick={() => setShowSort(v => !v)}
                    data-question-sort-toggle="true"
                    style={{ borderColor: '#E0E0E0' }}
                  >
                    <BarsArrowUpIcon size={20} strokeWidth={2} />
                  </button>
                  {showSort && (
                    <div className="question-filter-panel">
                      <h3 className="title-small mb-3">Sırala</h3>
                      <div className="flex flex-col gap-2">
                        {sortOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            className={`px-4 py-2 text-left rounded-lg transition-all ${
                              sortOption === option.value
                                ? 'bg-primary-500 text-white font-semibold'
                                : 'bg-gray-50 hover:bg-gray-100 text-dark-700'
                            }`}
                            onClick={() => {
                              setSortOption(option.value);
                              setShowSort(false);
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter Button - Circular */}
                <div className="relative" ref={filterRef} title="Filtrele">
                  <button
                    type="button"
                    className="p-3 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative"
                    onClick={() => setShowFilters(v => !v)}
                    data-question-filter-toggle="true"
                    style={{ borderColor: '#E0E0E0' }}
                  >
                    <FunnelIcon size={20} strokeWidth={2} />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs label-small text-white bg-primary-500 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  {showFilters && (
                    <div className="question-filter-panel">
                      <div className="grid gap-6 md:grid-cols-2">
                        {uniqueCategories.length > 0 && (
                          <div>
                            <h3 className="title-small">Kategoriler</h3>
                            <div className="question-filter-options">
                              {uniqueCategories.map(category => (
                                <label key={category} className="question-filter-option">
                                  <input
                                    type="checkbox"
                                    checked={filters.categories.includes(category)}
                                    onChange={() => toggleFilter('categories', category)}
                                  />
                                  <span>{category}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h3 className="title-small">Zorluk</h3>
                          <div className="question-filter-options">
                            {difficulties.map(diff => (
                              <label key={diff.value} className="question-filter-option">
                                <input
                                  type="checkbox"
                                  checked={filters.difficulties.includes(diff.value)}
                                  onChange={() => toggleFilter('difficulties', diff.value)}
                                />
                                <span>{diff.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {uniqueTypes.length > 0 && (
                          <div>
                            <h3 className="title-small">Soru Tipi</h3>
                            <div className="question-filter-options">
                              {uniqueTypes.map(type => (
                                <label key={type} className="question-filter-option">
                                  <input
                                    type="checkbox"
                                    checked={filters.types.includes(type)}
                                    onChange={() => toggleFilter('types', type)}
                                  />
                                  <span>{typeLabel(type)}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h3 className="title-small">Süre</h3>
                          <div className="question-filter-options">
                            <label className="question-filter-option">
                              <input
                                type="checkbox"
                                checked={filters.timers.includes('timed')}
                                onChange={() => toggleFilter('timers', 'timed')}
                              />
                              <span>Süreli</span>
                            </label>
                            <label className="question-filter-option">
                              <input
                                type="checkbox"
                                checked={filters.timers.includes('untimed')}
                                onChange={() => toggleFilter('timers', 'untimed')}
                              />
                              <span>Süresiz</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      {(activeFilterCount > 0 || search.trim()) && (
                        <div className="flex justify-end mt-4">
                          <button type="button" className="btn btn-ghost text-sm" onClick={resetFilters}>Temizle</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-dark-600">
                {visibleQuestions.length} / {questions.length} soru gösteriliyor
              </div>

              {/* 📦 Question Packages Chips */}
              {(packages.length > 0 || true) && (
                <div className="mt-4 pt-4 border-t border-dark-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-dark-700">📦 Hızlı Paketler:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Create Package Button */}
                    <button
                      type="button"
                      className="package-chip package-chip-create"
                      onClick={openPackageModal}
                      title="Yeni paket oluştur"
                    >
                      <span>+ Paket Oluştur</span>
                    </button>

                    {/* Package Chips */}
                    {packages.map(pkg => {
                      const currentUser = getCurrentUser();
                      const isOwner = pkg.createdBy === currentUser?.uid;
                      const isAdmin = currentUser?.role === 'admin';
                      const isSuperAdmin = currentUser?.isSuperAdmin === true;
                      const canDelete = isOwner || isAdmin || isSuperAdmin;

                      // Tooltip content
                      const roleDisplay = pkg.createdByRole === 'admin' ? 'Admin' :
                                         pkg.createdByRole === 'manager' ? 'Manager' :
                                         pkg.createdByRole === 'SuperAdmin' ? 'Süper Admin' :
                                         pkg.createdByRole || '-';

                      const tooltipText = `${pkg.name}\n` +
                        `━━━━━━━━━━━━━━━\n` +
                        `👤 ${pkg.createdByName || 'Bilinmeyen'}\n` +
                        `💼 ${roleDisplay}\n` +
                        `🏢 ${pkg.company || '-'}\n` +
                        `📝 ${pkg.questionCount} Soru`;

                      return (
                        <div key={pkg.id} className="relative group">
                          <button
                            type="button"
                            className={`package-chip ${selectedPackageId === pkg.id ? 'active' : ''}`}
                            onClick={() => selectPackage(pkg.id)}
                            title={tooltipText}
                          >
                            <span>{pkg.name}</span>
                            <span className="text-xs opacity-70">({pkg.questionCount})</span>
                            {!isOwner && <span className="text-xs opacity-50 ml-1">👤</span>}
                          </button>
                          {/* Delete button - shows on hover */}
                          {canDelete && (
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePackage(pkg.id);
                              }}
                              title="Paketi sil"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {errors.questions && <div className="error-text mb-2">{errors.questions}</div>}
            <div className="grid gap-3 max-h-96 overflow-y-auto p-2">
              {visibleQuestions.length === 0 ? (
                <div className="text-center py-8 text-dark-500">
                  <p className="text-sm mb-2">
                    {questions.length === 0 ? 'Aktif soru bulunmuyor' : 'Filtrelere uygun soru bulunamadı'}
                  </p>
                  {questions.length === 0 ? (
                    <a href="#/admin" className="btn btn-secondary mt-4">Soru Ekle</a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary text-xs px-3 py-1.5 mt-2"
                      onClick={resetFilters}
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              ) : (
                visibleQuestions.map(({ data, orderNumber }) => (
                  <label
                    key={data.id}
                    className={'option-card ' + (form.questionIds.includes(data.id) ? 'selected' : '')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.questionIds.includes(data.id)}
                        onChange={() => toggleQ(data.id)}
                        className="mt-1 w-5 h-5 flex-shrink-0"
                        style={{ cursor: 'pointer' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="chip bg-gray-200 text-gray-700 text-xs">#{orderNumber}</span>
                          {data.category && <span className="chip chip-orange text-xs">{data.category}</span>}
                          <span className="chip chip-blue text-xs">{typeLabel(data.type)}</span>
                          {data.difficulty && (
                            <span className="chip bg-gray-200 text-gray-600 text-xs">
                              {data.difficulty === 'easy' ? 'Kolay' : data.difficulty === 'medium' ? 'Orta' : 'Zor'}
                            </span>
                          )}
                          {data.hasTimer && Number(data.timerSeconds) > 0 ? (
                            <span className="chip chip-blue text-xs inline-flex items-center gap-1"><ClockIcon size={12} strokeWidth={2} /> {data.timerSeconds} sn</span>
                          ) : (
                            <span className="chip bg-gray-100 text-gray-500 text-xs">Süresiz</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-dark-900 break-words">{data.questionText}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Oluşturuluyor...' : 'Oluştur & QR Göster'}
            </button>
            <button className="btn btn-ghost" onClick={reset} disabled={saving}>İptal</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-6xl mb-4"><ChartBarIcon size={64} strokeWidth={1.5} className="inline text-primary-500" /></div>
              <p className="text-dark-500 text-lg">Henüz quiz oturumu oluşturulmamış</p>
              <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>İlk Oturumu Oluştur</button>
            </div>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="card p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`chip ${s.status === 'completed' ? 'chip-green' : 'chip-orange'}`}>
                        {s.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                      </span>
                    </div>
                    <p className="font-semibold text-lg text-dark-900 break-words">{s.employee?.fullName || '-'}</p>
                    <p className="text-sm text-dark-600 break-words">{s.employee?.store || '-'}</p>
                    <p className="text-xs text-dark-400 mt-2">
                      {(s.questionIds || []).length} soru • {fmtDate(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a href={'#/quiz/' + s.id} className="btn btn-secondary text-sm px-3 py-2 flex items-center gap-1" target="_blank">
                      <LinkIcon size={16} strokeWidth={2} /> Aç
                    </a>
                    <button className="btn btn-danger text-sm px-3 py-2" onClick={() => handleDelete(s.id)} title="Sil">
                      <TrashIcon size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 📦 Create Package Modal */}
      {showPackageModal && (
        <>
          <div className="overlay open" onClick={() => setShowPackageModal(false)}></div>
          <div
            className="modal-lg open"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 999,
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '700px',
              width: '95%',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark-900 flex items-center gap-2">
                📦 Yeni Soru Paketi Oluştur
              </h2>
              <button
                className="text-dark-400 hover:text-dark-900 text-2xl"
                onClick={() => setShowPackageModal(false)}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Package Name */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-dark-700">Paket Adı *</label>
                <input
                  className={`field ${packageErrors.name ? 'error' : ''}`}
                  value={packageForm.name}
                  onChange={e => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ör: Ürün Bilgisi - Temel Seviye"
                  autoFocus
                />
                {packageErrors.name && <div className="error-text">{packageErrors.name}</div>}
              </div>

              {/* Search, Sort & Filter */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-dark-700">Sorularda Ara ve Filtrele</label>
                <div className="flex items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <span className="question-search-icon"><MagnifyingGlassIcon size={18} strokeWidth={2} /></span>
                    <input
                      type="search"
                      className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white body-medium focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                      placeholder="Soru metninde ara..."
                      value={packageSearch}
                      onChange={(e) => setPackageSearch(e.target.value)}
                    />
                  </div>

                  {/* Sort Button */}
                  <div className="relative" ref={packageSortRef} title="Sırala">
                    <button
                      type="button"
                      className="p-2 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative"
                      onClick={() => setShowPackageSort(v => !v)}
                      data-package-sort-toggle="true"
                      style={{ borderColor: '#E0E0E0' }}
                    >
                      <BarsArrowUpIcon size={20} strokeWidth={2} />
                    </button>
                    {showPackageSort && (
                      <div className="question-filter-panel" style={{ right: 0, left: 'auto' }}>
                        <h3 className="title-small mb-3">Sırala</h3>
                        <div className="flex flex-col gap-2">
                          {sortOptions.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              className={`px-4 py-2 text-left rounded-lg transition-all ${
                                packageSort === option.value
                                  ? 'bg-primary-500 text-white font-semibold'
                                  : 'bg-gray-50 hover:bg-gray-100 text-dark-700'
                              }`}
                              onClick={() => {
                                setPackageSort(option.value);
                                setShowPackageSort(false);
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filter Button */}
                  <div className="relative" ref={packageFilterRef} title="Filtrele">
                    <button
                      type="button"
                      className="p-2 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative"
                      onClick={() => setShowPackageFilters(v => !v)}
                      data-package-filter-toggle="true"
                      style={{ borderColor: '#E0E0E0' }}
                    >
                      <FunnelIcon size={20} strokeWidth={2} />
                      {activePackageFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs label-small text-white bg-primary-500 rounded-full">
                          {activePackageFilterCount}
                        </span>
                      )}
                    </button>
                    {showPackageFilters && (
                      <div className="question-filter-panel" style={{ right: 0, left: 'auto', minWidth: '500px' }}>
                        <div className="grid gap-6 md:grid-cols-2">
                          {uniqueCategories.length > 0 && (
                            <div>
                              <h3 className="title-small">Kategoriler</h3>
                              <div className="question-filter-options">
                                {uniqueCategories.map(category => (
                                  <label key={category} className="question-filter-option">
                                    <input
                                      type="checkbox"
                                      checked={packageFilters.categories.includes(category)}
                                      onChange={() => togglePackageFilter('categories', category)}
                                    />
                                    <span>{category}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h3 className="title-small">Zorluk</h3>
                            <div className="question-filter-options">
                              {difficulties.map(diff => (
                                <label key={diff.value} className="question-filter-option">
                                  <input
                                    type="checkbox"
                                    checked={packageFilters.difficulties.includes(diff.value)}
                                    onChange={() => togglePackageFilter('difficulties', diff.value)}
                                  />
                                  <span>{diff.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {uniqueTypes.length > 0 && (
                            <div>
                              <h3 className="title-small">Soru Tipi</h3>
                              <div className="question-filter-options">
                                {uniqueTypes.map(type => (
                                  <label key={type} className="question-filter-option">
                                    <input
                                      type="checkbox"
                                      checked={packageFilters.types.includes(type)}
                                      onChange={() => togglePackageFilter('types', type)}
                                    />
                                    <span>{typeLabel(type)}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h3 className="title-small">Süre</h3>
                            <div className="question-filter-options">
                              <label className="question-filter-option">
                                <input
                                  type="checkbox"
                                  checked={packageFilters.timers.includes('timed')}
                                  onChange={() => togglePackageFilter('timers', 'timed')}
                                />
                                <span>Süreli</span>
                              </label>
                              <label className="question-filter-option">
                                <input
                                  type="checkbox"
                                  checked={packageFilters.timers.includes('untimed')}
                                  onChange={() => togglePackageFilter('timers', 'untimed')}
                                />
                                <span>Süresiz</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        {(activePackageFilterCount > 0 || packageSearch.trim()) && (
                          <div className="flex justify-end mt-4">
                            <button type="button" className="btn btn-ghost text-sm" onClick={resetPackageFilters}>Temizle</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-dark-600">
                  {visiblePackageQuestions.length} / {questions.length} soru gösteriliyor
                </div>
              </div>

              {/* Selected Count */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-dark-700">
                  Seçilen: {packageForm.questionIds.length} soru
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost text-xs px-3 py-1.5"
                    onClick={() => setPackageForm(prev => ({ ...prev, questionIds: visiblePackageQuestions.map(q => q.data.id) }))}
                  >
                    Tümünü Seç
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs px-3 py-1.5"
                    onClick={() => setPackageForm(prev => ({ ...prev, questionIds: [] }))}
                    disabled={packageForm.questionIds.length === 0}
                  >
                    Tümünü Kaldır
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {packageErrors.questionIds && <div className="error-text">{packageErrors.questionIds}</div>}
              <div className="grid gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg">
                {visiblePackageQuestions.length === 0 ? (
                  <div className="text-center py-8 text-dark-500">
                    <p className="text-sm">
                      {questions.length === 0 ? 'Aktif soru bulunmuyor' : 'Filtrelere uygun soru bulunamadı'}
                    </p>
                  </div>
                ) : (
                  visiblePackageQuestions.map(({ data, orderNumber }) => (
                    <label
                      key={data.id}
                      className={'option-card ' + (packageForm.questionIds.includes(data.id) ? 'selected' : '')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={packageForm.questionIds.includes(data.id)}
                          onChange={() => togglePackageQuestion(data.id)}
                          className="mt-1 w-5 h-5 flex-shrink-0"
                          style={{ cursor: 'pointer' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="chip bg-gray-200 text-gray-700 text-xs">#{orderNumber}</span>
                            {data.category && <span className="chip chip-orange text-xs">{data.category}</span>}
                            <span className="chip chip-blue text-xs">{typeLabel(data.type)}</span>
                            {data.difficulty && (
                              <span className="chip bg-gray-200 text-gray-600 text-xs">
                                {data.difficulty === 'easy' ? 'Kolay' : data.difficulty === 'medium' ? 'Orta' : 'Zor'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-dark-900 break-words">{data.questionText}</p>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  className="btn btn-primary"
                  onClick={createPackage}
                  disabled={packageForm.questionIds.length === 0}
                >
                  Oluştur ({packageForm.questionIds.length} soru)
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowPackageModal(false)}
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Page>
  );
};

window.Manager = Manager;
