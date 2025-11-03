const { useState, useEffect } = React;

const Result = ({ sessionId, resultId }) => {
  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await waitFirebase();
      try {
        const { db, doc, getDoc } = window.firebase;
        const r = await getDoc(doc(db, 'results', resultId));
        if (!r.exists()) {
          setLoading(false);
          toast('Sonuç bulunamadı', 'error');
          return;
        }
        const res = { id: r.id, ...r.data() };
        setData(res);
        
        const s = await getDoc(doc(db, 'quizSessions', res.sessionId));
        if (s.exists()) {
          const sd = { id: s.id, ...s.data() };
          setSession(sd);
          const qs = await Promise.all((sd.questionIds || []).map(id => getDoc(doc(db, 'questions', id))));
          setQuestions(qs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
        }
      } catch(e) {
        console.error('Result load error:', e);
        toast('Sonuç yüklenirken hata oluştu', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, resultId]);

  const downloadPDF = async () => {
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      pdf.setFontSize(14);
      pdf.text('QuizUp+ Sonuc Raporu', 14, 16);
      pdf.setFontSize(10);
      pdf.text('Personel: ' + (session?.employee?.fullName || '-'), 14, 24);
      pdf.text('Magaza: ' + (session?.employee?.store || '-'), 14, 30);
      pdf.text('Puan: ' + (data?.score?.correct || 0) + '/' + (data?.score?.total || 0) + ' (' + (data?.score?.percent || 0) + '%)', 14, 36);
      
      // Add time info
      if (data?.timeTracking) {
        const totalMin = Math.floor(data.timeTracking.totalTime / 60);
        const totalSec = data.timeTracking.totalTime % 60;
        pdf.text('Toplam Sure: ' + totalMin + ' dk ' + totalSec + ' sn', 14, 42);
        pdf.text('Ortalama Soru Suresi: ' + data.timeTracking.averageTimePerQuestion + ' sn', 14, 48);
      }
      
      let y = 58;
      questions.forEach((q, i) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.setFont(undefined, 'bold');
        pdf.text(((i + 1) + '. ' + q.questionText).slice(0, 95), 14, y);
        y += 5;
        pdf.setFont(undefined, 'normal');
        const ans = data?.answers?.[q.id];
        pdf.text(('Cevabin: ' + (ans == null ? '-' : String(ans))).slice(0, 95), 14, y);
        y += 5;
        if (q.type === 'mcq') {
          pdf.text(('Dogru: ' + (q.correctAnswer || '-')).slice(0, 95), 14, y);
          y += 5;
        }
        // Add time
        const qTime = data?.timeTracking?.questionTimes?.find(qt => qt.questionId === q.id);
        if (qTime) {
          pdf.text('Sure: ' + qTime.timeSpent + ' sn (' + qTime.status + ')', 14, y);
          y += 5;
        }
        y += 3;
      });
      pdf.save('quizup_result.pdf');
      toast('PDF indirildi', 'success');
    } catch(e) {
      console.error('PDF error:', e);
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

  return (
    <Page 
      title="Sonuç" 
      subtitle={(session?.employee?.fullName || 'Personel') + ' • ' + (session?.employee?.store || '')} 
      extra={<button className="btn btn-primary" onClick={downloadPDF}>📥 PDF İndir</button>}
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
                <div className="text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2">🏃 En Hızlı</div>
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
                <div className="text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2">🐌 En Yavaş</div>
                <div className="text-base sm:text-lg md:text-xl font-bold text-orange-600">
                  {slowestQ.timeSpent} sn
                </div>
                <div className="text-xs text-dark-500 mt-1 truncate">
                  {slowestQ.category}
                </div>
              </div>
            )}
          </div>
          
          {timeoutCount > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <span className="text-xl">⏰</span>
                <span className="text-sm font-semibold">
                  {timeoutCount} soruda süre doldu
                </span>
              </div>
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
                  <div className="text-2xl">
                    {ok === true ? '✓' : ok === false ? '✕' : '📝'}
                  </div>
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
                        {qTime.status === 'timeout' && (
                          <span className="chip bg-red-100 text-red-700">⏰ Süre Doldu</span>
                        )}
                        {qTime.status === 'skipped' && (
                          <span className="chip bg-gray-200 text-gray-700">⏭️ Atlandı</span>
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
          <a className="btn btn-secondary" href="#/tests">📊 Tüm Sonuçlar</a>
          <a className="btn btn-primary" href="#/manager">🆕 Yeni Quiz</a>
        </div>
      </div>
    </Page>
  );
};

window.Result = Result;
