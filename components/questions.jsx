const { useState, useEffect, useMemo, useRef } = React;

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    difficulties: [],
    statuses: [],
    types: [],
    timers: [],
    examTypes: [] // 🆕 Sınav Tipi filtresi
  });
  const [sortOption, setSortOption] = useState('order-asc');
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const animatedPlaceholder = useAnimatedPlaceholder();

  // 📥 Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf'); // pdf, word, excel
  const [exportExamType, setExportExamType] = useState('all'); // all, general, special
  const [exporting, setExporting] = useState(false);
  const exportModalRef = useRef(null);

  useEffect(() => {
    let unsubscribe = null;

    const loadQuestions = async () => {
      try {
        await waitFirebase();
        const { db, collection, query, orderBy, onSnapshot, where } = window.firebase;

        // 🔒 Super admin seçtiği şirkete göre, admin kendi şirketini görür
        const currentUser = getCurrentUser();

        // Logout sırasında query çalıştırma
        if (!currentUser) {
          setLoading(false);
          return;
        }

        // Get company identifiers for backward compatibility (checks both ID and name)
        const companyIdentifiers = getCompanyIdentifiersForQuery();

        let q;
        if (companyIdentifiers === null) {
          // Super admin: Tüm şirketlerin soruları
          q = query(
            collection(db, 'questions'),
            orderBy('createdAt', 'desc')
          );
        } else if (companyIdentifiers.length === 0) {
          // No company assigned - no questions to show
          setQuestions([]);
          setLoading(false);
          return;
        } else {
          // Filter by company (checks both ID and name for backward compatibility)
          q = query(
            collection(db, 'questions'),
            where('company', 'in', companyIdentifiers),
            orderBy('createdAt', 'desc')
          );
        }

        unsubscribe = onSnapshot(q, snapshot => {
          const ordered = snapshot.docs.map((doc, index) => {
            const data = doc.data();
            return {
              id: doc.id,
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
        }, error => {
          window.devError('Questions load error:', error);
          toast('Sorular yüklenirken hata oluştu', 'error');
          setLoading(false);
        });
      } catch (error) {
        window.devError('Questions init error:', error);
        toast('Sorular yüklenirken hata oluştu', 'error');
        setLoading(false);
      }
    };

    loadQuestions();

    // Super admin şirket değiştirdiğinde yeniden yükle
    const handleCompanyChange = () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      setLoading(true);
      loadQuestions();
    };

    window.addEventListener('company-changed', handleCompanyChange);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      window.removeEventListener('company-changed', handleCompanyChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('[data-question-filter-toggle]')) return;
      if (event.target.closest('[data-question-sort-toggle]')) return;
      if (event.target.closest('[data-export-modal-toggle]')) return;

      if (showFilters && filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }

      if (showSort && sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSort(false);
      }

      if (showExportModal && exportModalRef.current && !exportModalRef.current.contains(event.target)) {
        setShowExportModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, showSort, showExportModal]);

  const uniqueCategories = useMemo(() => {
    return [...new Set(questions.map(q => q.category).filter(Boolean))].sort();
  }, [questions]);

  const uniqueTypes = useMemo(() => {
    return [...new Set(questions.map(q => q.type).filter(Boolean))];
  }, [questions]);

  const difficulties = useMemo(() => ([
    { value: 'easy', label: 'Kolay' },
    { value: 'medium', label: 'Orta' },
    { value: 'hard', label: 'Zor' }
  ]), []);

  const stats = useMemo(() => {
    return questions.reduce((acc, q) => {
      if (q.isActive) acc.active += 1; else acc.inactive += 1;
      if (q.hasTimer) acc.timed += 1;
      return acc;
    }, { active: 0, inactive: 0, timed: 0 });
  }, [questions]);

  const toggleFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(v => v !== value)
        : [...prev[type], value]
    }));
  };

  const clearFilters = () => {
    setFilters({ categories: [], difficulties: [], statuses: [], types: [], timers: [], examTypes: [] });
  };

  const resetAll = () => {
    setSearch('');
    clearFilters();
    setShowFilters(false);
  };

  const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.statuses.length + filters.types.length + filters.timers.length + filters.examTypes.length;

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

      if (filters.statuses.length > 0) {
        const status = data.isActive ? 'active' : 'inactive';
        if (!filters.statuses.includes(status)) {
          return false;
        }
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

      // 🆕 Sınav Tipi filtresi
      if (filters.examTypes.length > 0) {
        const examType = data.examType || 'general';
        if (!filters.examTypes.includes(examType)) {
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
          return (a.data.questionText || '').localeCompare(b.data.questionText || '') || (a.orderNumber - b.orderNumber);
        case 'text-desc':
          return (b.data.questionText || '').localeCompare(a.data.questionText || '') || (a.orderNumber - b.orderNumber);
        case 'created-desc':
          return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
        case 'created-asc':
          return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
        case 'difficulty-easy':
          return (difficultyOrder[a.data.difficulty] || 2) - (difficultyOrder[b.data.difficulty] || 2) || (a.orderNumber - b.orderNumber);
        case 'difficulty-hard':
          return (difficultyOrder[b.data.difficulty] || 2) - (difficultyOrder[a.data.difficulty] || 2) || (a.orderNumber - b.orderNumber);
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
  }, [questions, search, filters, sortOption]);

  // 📥 Export fonksiyonları
  const getFilteredQuestionsForExport = () => {
    let filtered = questions;

    // Sınav tipi filtreleme
    if (exportExamType !== 'all') {
      filtered = filtered.filter(q => (q.examType || 'general') === exportExamType);
    }

    // Sıralama (order field'a göre)
    return filtered.sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : 999999;
      const orderB = typeof b.order === 'number' ? b.order : 999999;
      return orderA - orderB;
    });
  };

  const exportToPDF = async () => {
    if (!window.jspdf?.jsPDF) {
      toast('PDF kütüphanesi yüklenemedi', 'error');
      return;
    }

    try {
      setExporting(true);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('portrait', 'mm', 'a4');

      // Türkçe font desteği
      const fontReady = ensurePdfFont(pdf);
      const setFontWeight = (weight = 'normal') => {
        if (fontReady) {
          pdf.setFont('DejaVuSans', weight);
        } else {
          pdf.setFont('helvetica', weight);
        }
      };

      const exportQuestions = getFilteredQuestionsForExport();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Başlık
      setFontWeight('bold');
      pdf.setFontSize(16);
      pdf.setTextColor(26, 35, 50);
      pdf.text('Soru Bankası', margin, yPos);
      yPos += 8;

      setFontWeight('normal');
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      const exportTypeText = exportExamType === 'all' ? 'Tüm Sorular' :
                            exportExamType === 'general' ? 'Genel Sınav Soruları' :
                            'Özel Sınav Soruları';
      pdf.text(exportTypeText + ` (${exportQuestions.length} soru)`, margin, yPos);
      yPos += 10;

      // Sorular
      exportQuestions.forEach((q, index) => {
        const questionNumber = typeof q.order === 'number' ? q.order + 1 : index + 1;

        // Yeni sayfa kontrolü
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }

        // Soru numarası ve metni
        setFontWeight('bold');
        pdf.setFontSize(11);
        pdf.setTextColor(26, 35, 50);
        const questionText = `${questionNumber}. ${q.questionText}`;
        const lines = pdf.splitTextToSize(questionText, pageWidth - margin * 2);
        pdf.text(lines, margin, yPos);
        yPos += lines.length * 5;

        // Kategori, Zorluk, Sınav Tipi bilgileri
        setFontWeight('normal');
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        const metadata = [];
        if (q.category) metadata.push(`Kategori: ${q.category}`);
        if (q.difficulty) metadata.push(`Zorluk: ${q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : 'Zor'}`);
        if (q.examType) metadata.push(`Sınav Tipi: ${q.examType === 'special' ? 'Özel Sınav' : 'Genel Sınav'}`);
        if (metadata.length > 0) {
          pdf.text(metadata.join(' | '), margin, yPos);
          yPos += 5;
        }

        // Çoktan seçmeli seçenekler
        if (q.type === 'mcq' && q.options && q.options.length > 0) {
          setFontWeight('normal');
          pdf.setFontSize(10);
          pdf.setTextColor(26, 35, 50);
          q.options.forEach((option, optIndex) => {
            if (option && option.trim()) {
              const isCorrect = option === q.correctAnswer;
              const optionText = `  ${String.fromCharCode(65 + optIndex)}) ${option}${isCorrect ? ' ✓' : ''}`;
              const optionLines = pdf.splitTextToSize(optionText, pageWidth - margin * 2 - 5);

              if (isCorrect) {
                setFontWeight('bold');
                pdf.setTextColor(22, 163, 74); // Green
              }

              pdf.text(optionLines, margin + 3, yPos);
              yPos += optionLines.length * 5;

              if (isCorrect) {
                setFontWeight('normal');
                pdf.setTextColor(26, 35, 50);
              }
            }
          });
        }

        yPos += 5; // Sorular arası boşluk
      });

      // Dosya adı oluştur
      const examTypeSlug = exportExamType === 'all' ? 'tum' : exportExamType === 'general' ? 'genel' : 'ozel';
      const fileName = `sorular_${examTypeSlug}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast('PDF başarıyla indirildi', 'success');
      setShowExportModal(false);
    } catch (error) {
      window.devError('PDF export error:', error);
      toast('PDF oluştururken hata oluştu', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportToWord = () => {
    try {
      setExporting(true);
      const exportQuestions = getFilteredQuestionsForExport();

      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Soru Bankası</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; margin: 40px; }
    h1 { color: #1a2332; font-size: 24px; margin-bottom: 10px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 30px; }
    .question { margin-bottom: 25px; page-break-inside: avoid; }
    .question-header { font-weight: bold; font-size: 14px; color: #1a2332; margin-bottom: 8px; }
    .question-meta { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
    .options { margin-left: 20px; }
    .option { margin: 4px 0; font-size: 13px; }
    .correct { color: #16a34a; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Soru Bankası</h1>
  <div class="subtitle">${exportExamType === 'all' ? 'Tüm Sorular' : exportExamType === 'general' ? 'Genel Sınav Soruları' : 'Özel Sınav Soruları'} (${exportQuestions.length} soru)</div>
`;

      exportQuestions.forEach((q, index) => {
        const questionNumber = typeof q.order === 'number' ? q.order + 1 : index + 1;
        const metadata = [];
        if (q.category) metadata.push(`Kategori: ${q.category}`);
        if (q.difficulty) metadata.push(`Zorluk: ${q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : 'Zor'}`);
        if (q.examType) metadata.push(`Sınav Tipi: ${q.examType === 'special' ? 'Özel Sınav' : 'Genel Sınav'}`);

        htmlContent += `
  <div class="question">
    <div class="question-header">${questionNumber}. ${q.questionText}</div>
    ${metadata.length > 0 ? `<div class="question-meta">${metadata.join(' | ')}</div>` : ''}
`;

        if (q.type === 'mcq' && q.options && q.options.length > 0) {
          htmlContent += '    <div class="options">\n';
          q.options.forEach((option, optIndex) => {
            if (option && option.trim()) {
              const isCorrect = option === q.correctAnswer;
              htmlContent += `      <div class="option ${isCorrect ? 'correct' : ''}">${String.fromCharCode(65 + optIndex)}) ${option}${isCorrect ? ' ✓' : ''}</div>\n`;
            }
          });
          htmlContent += '    </div>\n';
        }

        htmlContent += '  </div>\n';
      });

      htmlContent += '</body></html>';

      // Word dosyası olarak indir
      const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const examTypeSlug = exportExamType === 'all' ? 'tum' : exportExamType === 'general' ? 'genel' : 'ozel';
      link.href = url;
      link.download = `sorular_${examTypeSlug}_${new Date().toISOString().split('T')[0]}.doc`;
      link.click();
      URL.revokeObjectURL(url);

      toast('Word dosyası başarıyla indirildi', 'success');
      setShowExportModal(false);
    } catch (error) {
      window.devError('Word export error:', error);
      toast('Word dosyası oluştururken hata oluştu', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    try {
      setExporting(true);
      const exportQuestions = getFilteredQuestionsForExport();

      // CSV formatında oluştur (Excel'de açılabilir)
      let csvContent = '\ufeff'; // UTF-8 BOM
      csvContent += 'Soru No,Soru Metni,Tip,Kategori,Zorluk,Sınav Tipi,Seçenek A,Seçenek B,Seçenek C,Seçenek D,Doğru Cevap,Durum\n';

      exportQuestions.forEach((q, index) => {
        const questionNumber = typeof q.order === 'number' ? q.order + 1 : index + 1;
        const row = [
          questionNumber,
          `"${(q.questionText || '').replace(/"/g, '""')}"`, // Escape quotes
          q.type === 'mcq' ? 'Çoktan Seçmeli' : 'Açık Uçlu',
          q.category || '',
          q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : q.difficulty === 'hard' ? 'Zor' : '',
          q.examType === 'special' ? 'Özel Sınav' : 'Genel Sınav',
          q.options && q.options[0] ? `"${q.options[0].replace(/"/g, '""')}"` : '',
          q.options && q.options[1] ? `"${q.options[1].replace(/"/g, '""')}"` : '',
          q.options && q.options[2] ? `"${q.options[2].replace(/"/g, '""')}"` : '',
          q.options && q.options[3] ? `"${q.options[3].replace(/"/g, '""')}"` : '',
          q.correctAnswer ? `"${q.correctAnswer.replace(/"/g, '""')}"` : '',
          q.isActive ? 'Aktif' : 'Pasif'
        ];
        csvContent += row.join(',') + '\n';
      });

      // Excel dosyası olarak indir
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const examTypeSlug = exportExamType === 'all' ? 'tum' : exportExamType === 'general' ? 'genel' : 'ozel';
      link.href = url;
      link.download = `sorular_${examTypeSlug}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast('Excel dosyası başarıyla indirildi', 'success');
      setShowExportModal(false);
    } catch (error) {
      window.devError('Excel export error:', error);
      toast('Excel dosyası oluştururken hata oluştu', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportToPDF();
    } else if (exportFormat === 'word') {
      exportToWord();
    } else if (exportFormat === 'excel') {
      exportToExcel();
    }
  };

  if (loading) {
    return (
      <Page title="Sorular">
        <LoadingSpinner text="Sorular yükleniyor..." />
      </Page>
    );
  }

  return (
    <Page
      title="Sorular"
      subtitle={`${visibleQuestions.length} / ${questions.length} soru gösteriliyor`}
      extra={(
        <div className="flex items-center gap-4">
          <div className="text-right text-sm text-dark-500 leading-5">
            <div>Aktif: <strong className="text-dark-800">{stats.active}</strong></div>
            <div>Pasif: <strong className="text-dark-800">{stats.inactive}</strong></div>
            <div>Zamanlayıcılı: <strong className="text-dark-800">{stats.timed}</strong></div>
          </div>
          {/* 📥 Export Butonu */}
          <button
            type="button"
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setShowExportModal(true)}
            data-export-modal-toggle
            title="Soruları Dışa Aktar"
          >
            <ArrowDownTrayIcon size={18} strokeWidth={2} />
          </button>
        </div>
      )}
    >
      <div className="card p-4 mb-6">
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

                    <div>
                      <h3 className="title-small">Durum</h3>
                      <div className="question-filter-options">
                        <label className="question-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.statuses.includes('active')}
                            onChange={() => toggleFilter('statuses', 'active')}
                          />
                          <span>Aktif</span>
                        </label>
                        <label className="question-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.statuses.includes('inactive')}
                            onChange={() => toggleFilter('statuses', 'inactive')}
                          />
                          <span>Pasif</span>
                        </label>
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

                    <div>
                      <h3 className="title-small">Sınav Tipi</h3>
                      <div className="question-filter-options">
                        <label className="question-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.examTypes.includes('general')}
                            onChange={() => toggleFilter('examTypes', 'general')}
                          />
                          <span>Genel Sınav</span>
                        </label>
                        <label className="question-filter-option">
                          <input
                            type="checkbox"
                            checked={filters.examTypes.includes('special')}
                            onChange={() => toggleFilter('examTypes', 'special')}
                          />
                          <span>Özel Sınav</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  {(activeFilterCount > 0 || search.trim()) && (
                    <div className="flex justify-end mt-4">
                      <button type="button" className="btn btn-ghost text-sm" onClick={resetAll}>Temizle</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {(search.trim() || activeFilterCount > 0) && (
              <button
                type="button"
                className="btn btn-ghost px-3 py-2 text-sm"
                onClick={resetAll}
              >
                Temizle
              </button>
            )}
          </div>
        </div>

      {visibleQuestions.length === 0 ? (
        <div className="card p-10 text-center text-dark-500">
          <div className="mb-4"><MagnifyingGlassIcon size={64} strokeWidth={1.5} className="inline text-dark-400" /></div>
          <p>Filtrelere uygun soru bulunamadı.</p>
          {(search.trim() || activeFilterCount > 0) && (
            <button type="button" className="btn btn-secondary mt-4" onClick={resetAll}>
              Filtreleri Temizle
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleQuestions.map(({ data }) => (
            <div key={data.id} className="card p-6 question-bank-card">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {data.type && <span className="chip chip-blue">{typeLabel(data.type)}</span>}
                  {data.category && <span className="chip chip-orange">{data.category}</span>}
                  {data.examType && (
                    <span className={`chip ${data.examType === 'special' ? 'bg-purple-500 text-white' : 'bg-teal-500 text-white'}`}>
                      {data.examType === 'special' ? 'Özel Sınav' : 'Genel Sınav'}
                    </span>
                  )}
                  {data.difficulty && (
                    <span className="chip bg-gray-200 text-gray-600">
                      {data.difficulty === 'easy' ? 'Kolay' : data.difficulty === 'medium' ? 'Orta' : 'Zor'}
                    </span>
                  )}
                  <span className={`chip ${data.isActive ? 'chip-green' : 'chip-orange'}`}>
                    {data.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  {data.hasTimer && data.timerSeconds > 0 && (
                    <span className="chip chip-blue inline-flex items-center gap-1">
                      <ClockIcon size={14} strokeWidth={2} /> {data.timerSeconds} sn
                    </span>
                  )}
                </div>

                {data.questionImageUrl && (
                  <div className="question-bank-image">
                    <img src={data.questionImageUrl} alt="Soru görseli" loading="lazy" />
                  </div>
                )}

                <h2 className="text-xl font-semibold text-dark-900">{data.questionText}</h2>

                {data.type === 'mcq' ? (
                  <ul className={`question-bank-options ${data.hasImageOptions ? 'has-image-options' : ''}`}>
                    {(data.options || []).filter(Boolean).map((option, index) => {
                      const isCorrect = data.correctAnswer && data.correctAnswer === option;
                      const imageUrl = data.hasImageOptions && Array.isArray(data.optionImageUrls)
                        ? data.optionImageUrls[index]
                        : null;
                      return (
                        <li key={index} className={`question-bank-option ${isCorrect ? 'correct' : ''}`}>
                          <div className="question-bank-option-header">
                            <span className="option-index">{String.fromCharCode(65 + index)}</span>
                            <span className="option-text">{option}</span>
                            {isCorrect && <span className="option-correct inline-flex items-center gap-1"><CheckIcon size={14} strokeWidth={2} /> Doğru</span>}
                          </div>
                          {imageUrl && (
                            <div className="option-image">
                              <img src={imageUrl} alt={`Seçenek ${index + 1}`} loading="lazy" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  data.correctAnswer ? (
                    <div className="question-bank-answer">
                      <span className="option-index"><CheckIcon size={18} strokeWidth={2} /></span>
                      <div>
                        <div className="option-label">Beklenen Yanıt</div>
                        <div className="option-text">{data.correctAnswer}</div>
                      </div>
                    </div>
                  ) : null
                )}

                <div className="question-bank-meta">
                  <span>Oluşturulma: <strong>{fmtDate(data.createdAt)}</strong></span>
                  <span>Güncelleme: <strong>{fmtDate(data.updatedAt || data.createdAt)}</strong></span>
                  <span>ID: <code>{data.id}</code></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📥 Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            ref={exportModalRef}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in"
            data-export-modal-toggle
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-dark-900">Soruları Dışa Aktar</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-dark-400 hover:text-dark-600 transition-colors"
              >
                <XMarkIcon size={24} strokeWidth={2} />
              </button>
            </div>

            {/* Format Seçimi */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-dark-700">Dosya Formatı</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    exportFormat === 'pdf'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-dark-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-xs font-semibold">PDF</div>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('word')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    exportFormat === 'word'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-dark-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📝</div>
                  <div className="text-xs font-semibold">Word</div>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('excel')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    exportFormat === 'excel'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-dark-600'
                  }`}
                >
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xs font-semibold">Excel</div>
                </button>
              </div>
            </div>

            {/* Sınav Tipi Filtresi */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-dark-700">Sınav Tipi</label>
              <div className="space-y-2">
                <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50" style={{ borderColor: exportExamType === 'all' ? '#f97316' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="exportExamType"
                    value="all"
                    checked={exportExamType === 'all'}
                    onChange={(e) => setExportExamType(e.target.value)}
                    className="mr-3"
                  />
                  <span className="font-medium text-dark-700">Tümü</span>
                  <span className="ml-auto text-xs text-dark-500">({questions.length} soru)</span>
                </label>
                <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50" style={{ borderColor: exportExamType === 'general' ? '#14b8a6' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="exportExamType"
                    value="general"
                    checked={exportExamType === 'general'}
                    onChange={(e) => setExportExamType(e.target.value)}
                    className="mr-3"
                  />
                  <span className="font-medium text-dark-700">Genel Sınav</span>
                  <span className="ml-auto text-xs text-dark-500">
                    ({questions.filter(q => (q.examType || 'general') === 'general').length} soru)
                  </span>
                </label>
                <label className="flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50" style={{ borderColor: exportExamType === 'special' ? '#a855f7' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="exportExamType"
                    value="special"
                    checked={exportExamType === 'special'}
                    onChange={(e) => setExportExamType(e.target.value)}
                    className="mr-3"
                  />
                  <span className="font-medium text-dark-700">Özel Sınav</span>
                  <span className="ml-auto text-xs text-dark-500">
                    ({questions.filter(q => q.examType === 'special').length} soru)
                  </span>
                </label>
              </div>
            </div>

            {/* Butonlar */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="flex-1 btn btn-ghost"
                disabled={exporting}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex-1 btn btn-primary"
                disabled={exporting}
              >
                {exporting ? 'İndiriliyor...' : 'İndir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

window.QuestionBank = QuestionBank;
