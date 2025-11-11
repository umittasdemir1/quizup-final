const { useState, useEffect } = React;

const sanitizeBase64 = (input) => (input || '').replace(/\s+/g, '');

const ensurePdfFont = (pdf) => {
  const base64 = window.__QUIZUP_PDF_FONTS?.dejaVuSans;
  if (!base64) return false;
  const cleaned = sanitizeBase64(base64);
  try {
    if (!window.__QUIZUP_PDF_FONT_REGISTERED) {
      pdf.addFileToVFS('DejaVuSans.ttf', cleaned);
      pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
      pdf.addFont('DejaVuSans.ttf', 'DejaVuSans', 'bold');
      window.__QUIZUP_PDF_FONT_REGISTERED = true;
    }
    pdf.setFont('DejaVuSans', 'normal');
    return true;
  } catch (err) {
    window.devWarn('PDF font yüklenemedi:', err);
    return false;
  }
};

const fetchImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Logo isteği başarısız: ${response.status}`);
    }
    const blob = await response.blob();
    const format = (blob.type || '').toLowerCase().includes('png') ? 'PNG'
      : (blob.type || '').toLowerCase().includes('jpg') || (blob.type || '').toLowerCase().includes('jpeg') ? 'JPEG'
      : 'PNG';

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ dataUrl: reader.result, format });
      reader.onerror = () => reject(new Error('Logo dosyası okunamadı'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    window.devWarn('Logo yüklenemedi:', err);
    return null;
  }
};

const generateQRCodeDataUrl = (text, size = 220) => new Promise((resolve, reject) => {
  if (!window.QRCode) {
    reject(new Error('QR kod kütüphanesi yüklenmedi'));
    return;
  }

  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.left = '-10000px';
  temp.style.top = '0';
  temp.style.width = `${size}px`;
  temp.style.height = `${size}px`;
  document.body.appendChild(temp);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    temp.remove();
  };

  try {
    new window.QRCode(temp, {
      text,
      width: size,
      height: size,
      correctLevel: window.QRCode.CorrectLevel.H
    });
  } catch (err) {
    cleanup();
    reject(err);
    return;
  }

  const tryResolve = (attempt = 0) => {
    const canvas = temp.querySelector('canvas');
    const img = temp.querySelector('img');

    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        cleanup();
        resolve({ dataUrl, format: 'PNG' });
        return;
      } catch (err) {
        cleanup();
        reject(err);
        return;
      }
    }

    if (img && img.src) {
      const done = img.complete || attempt > 10;
      if (done) {
        const format = img.src.startsWith('data:image/jpeg') ? 'JPEG'
          : img.src.startsWith('data:image/webp') ? 'WEBP'
          : 'PNG';
        cleanup();
        resolve({ dataUrl: img.src, format });
        return;
      }
    }

    if (attempt > 20) {
      cleanup();
      reject(new Error('QR kod oluşturulamadı'));
      return;
    }

    setTimeout(() => tryResolve(attempt + 1), 50);
  };

  setTimeout(() => tryResolve(), 0);
});

const titleCase = (value) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const getDateParts = (inputDate) => {
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
  const locale = 'tr-TR';
  const day = titleCase(new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date));
  const dateLabel = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  const timeLabel = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
  return { day, date: dateLabel, time: timeLabel };
};

const formatDurationDetailed = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '0 sn';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes <= 0) return `${secs} sn`;
  return `${minutes} dk ${secs} sn`;
};

const computeCategoryStats = (questions, answers, questionTimes) => {
  const stats = {};
  const timeMap = {};

  (questionTimes || []).forEach((qt) => {
    if (qt?.questionId) {
      timeMap[qt.questionId] = qt;
    }
  });

  questions.forEach((q) => {
    const category = q.category || 'Kategorisiz';
    if (!stats[category]) {
      stats[category] = {
        category,
        questionCount: 0,
        correct: 0,
        incorrect: 0,
        timeSpent: 0
      };
    }

    const entry = stats[category];
    entry.questionCount += 1;

    const qTime = timeMap[q.id];
    if (qTime?.timeSpent) {
      entry.timeSpent += Number(qTime.timeSpent) || 0;
    }

    let isCorrect = null;
    if (typeof qTime?.correct === 'boolean') {
      isCorrect = qTime.correct;
    } else if (q.type === 'mcq') {
      const picked = answers?.[q.id];
      if (picked != null && picked !== '') {
        isCorrect = picked === q.correctAnswer;
      } else if (qTime?.status === 'timeout' || qTime?.status === 'skipped') {
        isCorrect = false;
      }
    }

    if (isCorrect === true) entry.correct += 1;
    if (isCorrect === false) entry.incorrect += 1;
  });

  return Object.values(stats).sort((a, b) => a.category.localeCompare(b.category, 'tr'));
};

const buildManagerName = (creator) => {
  if (!creator) return null;
  const first = creator.firstName || creator.name || '';
  const last = creator.lastName || creator.surname || '';
  const full = `${first} ${last}`.trim();
  return full || creator.email || null;
};

const Result = ({ sessionId, resultId }) => {
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [branding, setBranding] = useState(null);
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      await waitFirebase();
      try {
        const { db, doc, getDoc } = window.firebase;
        const resultSnap = await getDoc(doc(db, 'results', resultId));

        if (!resultSnap.exists()) {
          if (active) {
            setData(null);
            setSession(null);
            setQuestions([]);
            setBranding(null);
            setCreator(null);
            toast('Sonuç bulunamadı', 'error');
          }
          return;
        }

        const resultData = { id: resultSnap.id, ...resultSnap.data() };
        if (!active) return;
        setData(resultData);

        const { db: dbInstance, doc: docFn, getDoc: getDocFn } = window.firebase;
        const brandingPromise = getDocFn(docFn(dbInstance, 'settings', 'branding')).catch((err) => {
          window.devWarn('Branding yüklenemedi:', err);
          return null;
        });

        let sessionSnapshot = null;
        if (resultData.sessionId) {
          try {
            sessionSnapshot = await getDoc(doc(db, 'quizSessions', resultData.sessionId));
          } catch (err) {
            window.devWarn('Oturum yüklenemedi:', err);
          }
        }

        if (!active) return;

        if (sessionSnapshot?.exists()) {
          const sessionData = { id: sessionSnapshot.id, ...sessionSnapshot.data() };
          setSession(sessionData);

          const questionDocs = await Promise.all((sessionData.questionIds || []).map((qid) => getDoc(doc(db, 'questions', qid))));
          if (!active) return;
          setQuestions(questionDocs.filter((docSnap) => docSnap.exists()).map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

          if (sessionData.createdBy) {
            try {
              const creatorSnap = await getDoc(doc(db, 'users', sessionData.createdBy));
              if (active) {
                setCreator(creatorSnap.exists() ? { id: creatorSnap.id, ...creatorSnap.data() } : null);
              }
            } catch (err) {
              window.devWarn('Yetkili bilgisi alınamadı:', err);
              if (active) {
                setCreator(null);
              }
            }
          } else if (active) {
            setCreator(null);
          }
        } else if (active) {
          setSession(null);
          setQuestions([]);
          setCreator(null);
        }

        const brandingSnap = await brandingPromise;
        if (active) {
          setBranding(brandingSnap?.exists() ? { id: brandingSnap.id, ...brandingSnap.data() } : null);
        }
      } catch (e) {
        if (active) {
          window.devError('Result load error:', e);
          toast('Sonuç yüklenirken hata oluştu', 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [sessionId, resultId]);

  const downloadPDF = async () => {
    if (!window.jspdf?.jsPDF) {
      toast('PDF kütüphanesi yüklenemedi', 'error');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const fontReady = ensurePdfFont(pdf);
      if (!fontReady) {
        pdf.setFont('helvetica', 'normal');
      }

      const setFontWeight = (weight = 'normal') => {
        if (fontReady) {
          pdf.setFont('DejaVuSans', weight);
        } else {
          pdf.setFont('helvetica', weight);
        }
      };

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const topY = margin;

      const submittedDate = data?.submittedAt?.toDate
        ? data.submittedAt.toDate()
        : (data?.submittedAt ? new Date(data.submittedAt) : new Date());
      const dateParts = getDateParts(submittedDate);

      const dateBoxWidth = 58;
      const dateBoxHeight = 32;
      const dateBoxX = pageWidth - margin - dateBoxWidth;
      const dateBoxY = topY;

      pdf.setDrawColor(215, 219, 223);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(dateBoxX, dateBoxY, dateBoxWidth, dateBoxHeight, 3, 3, 'S');
      setFontWeight('bold');
      pdf.setFontSize(10);
      pdf.setTextColor(26, 35, 50);
      pdf.text(dateParts.day, dateBoxX + dateBoxWidth / 2, dateBoxY + 11, { align: 'center' });
      setFontWeight('normal');
      pdf.setFontSize(9);
      pdf.text(dateParts.date, dateBoxX + dateBoxWidth / 2, dateBoxY + 19, { align: 'center' });
      pdf.text(dateParts.time, dateBoxX + dateBoxWidth / 2, dateBoxY + 27, { align: 'center' });

      let contentTop = topY;
      if (branding?.logoUrl) {
        const logoData = await fetchImageAsDataUrl(branding.logoUrl);
        if (logoData?.dataUrl) {
          try {
            const props = pdf.getImageProperties(logoData.dataUrl);
            const maxWidth = 70;
            const maxHeight = 28;
            let logoWidth = maxWidth;
            let logoHeight = maxHeight;
            if (props?.width && props?.height) {
              const aspect = props.width / props.height;
              logoWidth = Math.min(maxWidth, maxHeight * aspect);
              logoHeight = logoWidth / aspect;
              if (logoHeight > maxHeight) {
                logoHeight = maxHeight;
                logoWidth = logoHeight * aspect;
              }
            }
            const logoX = (pageWidth - logoWidth) / 2;
            pdf.addImage(logoData.dataUrl, logoData.format || 'PNG', logoX, topY, logoWidth, logoHeight);
            contentTop = topY + logoHeight;
          } catch (err) {
            window.devWarn('Logo PDF\'e eklenemedi:', err);
          }
        }
      }

      contentTop = Math.max(contentTop, topY + 28);

      const marginLeft = margin;
      let currentY = contentTop + 14;

      const employeeName = data?.employee?.fullName || session?.employee?.fullName || '-';
      const storeName = session?.employee?.store || data?.employee?.store || '';
      setFontWeight('bold');
      pdf.setFontSize(12);
      pdf.setTextColor(26, 35, 50);
      pdf.text(`Sayın ${employeeName || '-'},`, marginLeft, currentY);
      currentY += 7;
      setFontWeight('normal');
      pdf.setFontSize(10);
      if (storeName) {
        pdf.text(`Mağaza: ${storeName}`, marginLeft, currentY);
        currentY += 6;
      }
      pdf.text('Sınav performans özetiniz aşağıda sunulmuştur.', marginLeft, currentY);
      currentY += 10;

      let qrBottom = currentY;
      const qrLink = `${location.origin}${location.pathname}#/tests?focus=${resultId}`;
      let qrData = null;
      try {
        qrData = await generateQRCodeDataUrl(qrLink, 260);
      } catch (err) {
        window.devWarn('QR kod oluşturulamadı:', err);
      }

      const qrSize = 42;
      if (qrData?.dataUrl) {
        pdf.addImage(qrData.dataUrl, qrData.format || 'PNG', marginLeft, currentY, qrSize, qrSize);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text('Tarayarak test sonuçlarını görüntüleyin', marginLeft + qrSize / 2, currentY + qrSize + 4, { align: 'center' });
        qrBottom = currentY + qrSize + 10;
      }

      const categoryStats = computeCategoryStats(questions, data?.answers, questionTimes);
      const tableX = qrData?.dataUrl ? marginLeft + qrSize + 12 : marginLeft;
      const tableTop = currentY;
      const tableWidth = pageWidth - tableX - margin;
      const headerHeight = 9;
      const rowHeight = 8;
      const columns = [
        { key: 'category', label: 'Kategori', width: tableWidth * 0.38, align: 'left' },
        { key: 'questionCount', label: 'Soru', width: tableWidth * 0.14, align: 'center' },
        { key: 'correct', label: 'Doğru', width: tableWidth * 0.16, align: 'center' },
        { key: 'incorrect', label: 'Yanlış', width: tableWidth * 0.16, align: 'center' },
        { key: 'timeSpent', label: 'Süre', width: tableWidth * 0.16, align: 'center' }
      ];

      pdf.setDrawColor(217, 221, 228);
      pdf.setFillColor(245, 248, 252);
      pdf.rect(tableX, tableTop, tableWidth, headerHeight, 'FD');
      setFontWeight('bold');
      pdf.setFontSize(9);
      pdf.setTextColor(96, 104, 118);
      let headerX = tableX;
      columns.forEach((col) => {
        const align = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
        const textX = col.align === 'center' ? headerX + col.width / 2 : col.align === 'right' ? headerX + col.width - 2 : headerX + 2;
        pdf.text(col.label, textX, tableTop + 6, { align });
        headerX += col.width;
      });

      let tableY = tableTop + headerHeight;
      setFontWeight('normal');
      pdf.setTextColor(26, 35, 50);

      if (categoryStats.length === 0) {
        pdf.setFontSize(9);
        pdf.text('Kategori verisi bulunamadı', tableX + tableWidth / 2, tableY + 6, { align: 'center' });
        tableY += rowHeight;
      } else {
        categoryStats.forEach((row) => {
          pdf.setDrawColor(230, 234, 240);
          pdf.rect(tableX, tableY, tableWidth, rowHeight, 'S');
          let cellX = tableX;
          columns.forEach((col) => {
            let value = row[col.key];
            if (col.key === 'timeSpent') {
              value = formatDurationDetailed(row.timeSpent);
            }
            if (col.key === 'category') {
              value = value || 'Diğer';
            }
            const align = col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left';
            const textX = col.align === 'center' ? cellX + col.width / 2 : col.align === 'right' ? cellX + col.width - 2 : cellX + 2;
            pdf.setFontSize(9);
            pdf.text(String(value ?? '-'), textX, tableY + 5.5, { align });
            cellX += col.width;
          });
          tableY += rowHeight;
        });
      }

      const sectionBottom = Math.max(qrBottom, tableY);
      const summaryTop = sectionBottom + 8;
      const summaryWidth = pageWidth - margin * 2;
      const summaryHeight = 30;

      pdf.setDrawColor(217, 221, 228);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, summaryTop, summaryWidth, summaryHeight, 3, 3, 'S');

      const totalCorrect = data?.score?.correct || 0;
      const totalQuestions = data?.score?.total || questions.length || 0;
      const totalWrong = Math.max(0, totalQuestions - totalCorrect);
      const percent = data?.score?.percent ?? (totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0);
      const totalTime = data?.timeTracking?.totalTime || 0;
      const summaryItems = [
        { label: 'Toplam Soru', value: totalQuestions },
        { label: 'Doğru', value: totalCorrect },
        { label: 'Yanlış', value: totalWrong },
        { label: 'Başarı', value: `${percent}%` },
        { label: 'Toplam Süre', value: formatDurationDetailed(totalTime) }
      ];
      const itemWidth = summaryWidth / summaryItems.length;

      summaryItems.forEach((item, idx) => {
        const centerX = margin + itemWidth * idx + itemWidth / 2;
        setFontWeight('normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(107, 114, 128);
        pdf.text(item.label, centerX, summaryTop + 9, { align: 'center' });
        setFontWeight('bold');
        pdf.setFontSize(12);
        pdf.setTextColor(26, 35, 50);
        pdf.text(String(item.value), centerX, summaryTop + 19, { align: 'center' });
      });

      const managerTop = summaryTop + summaryHeight + 12;
      const managerName = buildManagerName(creator);
      setFontWeight('bold');
      pdf.setFontSize(10);
      pdf.setTextColor(26, 35, 50);
      pdf.text(`Sınavı Uygulayan Yetkili: ${managerName || 'Belirtilmedi'}`, margin, managerTop);
      setFontWeight('normal');
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Rapor oluşturulma tarihi: ${dateParts.date} ${dateParts.time}`, margin, managerTop + 6);

      pdf.save('quizup_sonuc.pdf');
      toast('PDF indirildi', 'success');
    } catch (e) {
      window.devError('PDF error:', e);
      toast('PDF oluşturulurken hata oluştu', 'error');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0 sn';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min === 0) return `${sec} sn`;
    return `${min} dk ${sec} sn`;
  };

  if (loading) return <Page title="Sonuç"><LoadingSpinner text="Sonuç yükleniyor..." /></Page>;
  if (!data) return <Page title="Sonuç"><div className="card p-6 text-red-600">Sonuç bulunamadı.</div></Page>;

  const correct = data.score?.correct || 0;
  const total = data.score?.total || 0;
  const percent = data.score?.percent || 0;
  const circ = 534;
  const off = circ - (circ * correct / Math.max(1, total));

  // Time analytics
  const timeTracking = data.timeTracking || {};
  const questionTimes = timeTracking.questionTimes || [];
  const sortedByTime = [...questionTimes].sort((a, b) => b.timeSpent - a.timeSpent);
  const fastestQ = sortedByTime[sortedByTime.length - 1];
  const slowestQ = sortedByTime[0];
  const timeoutCount = questionTimes.filter(qt => qt.status === 'timeout').length;
  const skippedCount = questionTimes.filter(qt => qt.status === 'skipped').length;
  const totalTimeouts = typeof data.score?.timeouts === 'number' ? data.score.timeouts : timeoutCount;
  const totalSkipped = typeof data.score?.skipped === 'number' ? data.score.skipped : skippedCount;

  return (
    <Page 
      title="Sonuç" 
      subtitle={(session?.employee?.fullName || 'Personel') + ' • ' + (session?.employee?.store || '')} 
      extra={<button className="btn btn-primary flex items-center gap-2" onClick={downloadPDF}><ArrowDownTrayIcon size={18} strokeWidth={2} /> PDF İndir</button>}
    >
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Score Circle - Fixed inline display */}
        <div className="card p-8 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[240px] aspect-square">
            <svg className="w-full h-full" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" fill="none" stroke="#e5e7eb" strokeWidth="12" />
              <circle 
                cx="100" 
                cy="100" 
                r="85" 
                fill="none" 
                stroke={percent >= 70 ? '#5EC5B6' : percent >= 50 ? '#FF6B4A' : '#dc2626'}
                strokeWidth="12" 
                strokeDasharray="534" 
                strokeDashoffset={String(off)} 
                transform="rotate(-90 100 100)" 
                strokeLinecap="round" 
              />
              <text x="100" y="110" textAnchor="middle" fontSize="64" fontWeight="bold" fill="#1A2332">
                {correct}<tspan fontSize="28" fill="#6b7280">/{total}</tspan>
              </text>
            </svg>
          </div>
          <div className="mt-4 text-center">
            <div className="text-4xl font-black" style={{ color: percent >= 70 ? '#5EC5B6' : percent >= 50 ? '#FF6B4A' : '#dc2626' }}>
              {percent}%
            </div>
            <div className="text-sm text-dark-500 mt-1">Başarı Oranı</div>
          </div>
        </div>

        {/* Time Stats */}
        <div className="card p-4 sm:p-6 lg:col-span-2">
          <h3 className="text-base sm:text-lg font-bold text-dark-900 mb-3 sm:mb-4">⏱️ Süre İstatistikleri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-primary-50 p-3 sm:p-4 rounded-xl border border-primary-200 flex flex-col justify-center min-h-[80px]">
              <div className="text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2">Toplam Süre</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary-600">
                {formatTime(timeTracking.totalTime)}
              </div>
            </div>

            <div className="bg-secondary-50 p-3 sm:p-4 rounded-xl border border-secondary-200 flex flex-col justify-center min-h-[80px]">
              <div className="text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2">Ortalama Soru Süresi</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-secondary-600">
                {timeTracking.averageTimePerQuestion || 0} sn
              </div>
            </div>

            {fastestQ && (
              <div className="bg-accent-50 p-3 sm:p-4 rounded-xl border border-accent-200 flex flex-col justify-center min-h-[80px]">
                <div className="text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2 flex items-center gap-1">
                  <BoltIcon size={16} strokeWidth={2} /> En Hızlı
                </div>
                <div className="text-base sm:text-lg md:text-xl font-bold text-accent-600">
                  {fastestQ.timeSpent} sn
                </div>
                <div className="text-xs text-dark-500 mt-1 truncate">
                  {fastestQ.category}
                </div>
              </div>
            )}

            {slowestQ && (
              <div className="bg-orange-50 p-3 sm:p-4 rounded-xl border border-orange-200 flex flex-col justify-center min-h-[80px]">
                <div className="text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2 flex items-center gap-1">
                  <ClockIcon size={16} strokeWidth={2} /> En Yavaş
                </div>
                <div className="text-base sm:text-lg md:text-xl font-bold text-orange-600">
                  {slowestQ.timeSpent} sn
                </div>
                <div className="text-xs text-dark-500 mt-1 truncate">
                  {slowestQ.category}
                </div>
              </div>
            )}
          </div>
          
          {(totalTimeouts > 0 || totalSkipped > 0) && (
            <div className="mt-4 space-y-2">
              {totalTimeouts > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <span className="text-xl">⏰</span>
                    <span className="text-sm font-semibold">
                      {totalTimeouts} soruda süre doldu
                    </span>
                  </div>
                </div>
              )}
              {totalSkipped > 0 && (
                <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-xl">⭕</span>
                    <span className="text-sm font-semibold">
                      {totalSkipped} soru boş bırakıldı
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Questions & Answers */}
      <div className="card p-6">
        <div className="text-sm font-semibold text-dark-500 mb-4">Cevaplarınız</div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {questions.map((q, i) => {
            const picked = data.answers?.[q.id];
            const ok = q.type === 'mcq' ? picked === q.correctAnswer : null;
            const qTime = questionTimes.find(qt => qt.questionId === q.id);
            
            const status = qTime?.status;
            const getLeadingIcon = () => {
              if (status === 'timeout') {
                return <ClockIcon size={28} strokeWidth={1.5} className="text-orange-600" />;
              } else if (status === 'skipped') {
                return <MinusCircleIcon size={28} strokeWidth={1.5} className="text-gray-500" />;
              } else if (ok === true) {
                return <CheckIcon size={28} strokeWidth={2} className="text-accent-600" />;
              } else if (ok === false) {
                return <XMarkIcon size={28} strokeWidth={2} className="text-red-600" />;
              } else {
                return <DocumentTextIcon size={28} strokeWidth={1.5} className="text-secondary-500" />;
              }
            };

            return (
              <div
                key={q.id}
                className={
                  'p-4 rounded-xl border-2 ' +
                  (ok === true ? 'border-accent-400 bg-accent-50' :
                   ok === false ? 'border-red-300 bg-red-50' :
                   'border-secondary-200 bg-secondary-50')
                }
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">{getLeadingIcon()}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-dark-900 mb-2">
                      {i + 1}. {q.questionText}
                    </div>
                    <div className="text-xs text-dark-700">
                      <b>Cevabınız:</b> {picked == null ? '-' : String(picked)}
                    </div>
                    {q.type === 'mcq' && (
                      <div className="text-xs text-dark-700 mt-1">
                        <b>Doğru Cevap:</b> <span className="text-accent-600 font-semibold">{q.correctAnswer}</span>
                      </div>
                    )}
                    {qTime && (
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="chip chip-blue">⏱️ {qTime.timeSpent} sn</span>
                        {status === 'timeout' && (
                          <span className="chip bg-red-100 text-red-700">⏰ Süre Doldu</span>
                        )}
                        {status === 'skipped' && (
                          <span className="chip bg-gray-200 text-gray-700">⭕ Boş Bırakıldı</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <a className="btn btn-secondary flex items-center gap-2" href="#/tests">
            <ChartBarIcon size={18} strokeWidth={2} /> Tüm Sonuçlar
          </a>
          <a className="btn btn-primary flex items-center gap-2" href="#/manager">
            <PlusCircleIcon size={18} strokeWidth={2} /> Yeni Quiz
          </a>
        </div>
      </div>
    </Page>
  );
};

window.Result = Result;
