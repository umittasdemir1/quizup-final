const { useState, useEffect } = React;

const Dashboard = () => {
  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await waitFirebase();
      const { db, collection, getDocs } = window.firebase;
      try {
        const [qSnap, sSnap, rSnap] = await Promise.all([
          getDocs(collection(db, 'questions')),
          getDocs(collection(db, 'quizSessions')),
          getDocs(collection(db, 'results'))
        ]);
        setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSessions(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setResults(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) {
        console.error('Dashboard load error:', e);
        toast('Dashboard yüklenirken hata oluştu', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Page title="Dashboard"><LoadingSpinner text="Dashboard yükleniyor..." /></Page>;

  // KPI Calculations
  const totalQuestions = questions.length;
  const activeQuestions = questions.filter(q => q.isActive).length;
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const totalResults = results.length;
  const avgScore = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + (r.score?.percent || 0), 0) / results.length) 
    : 0;

  // ⏱️ Time Analytics
  const resultsWithTime = results.filter(r => r.timeTracking?.totalTime);
  const avgQuizTime = resultsWithTime.length > 0
    ? Math.round(resultsWithTime.reduce((sum, r) => sum + r.timeTracking.totalTime, 0) / resultsWithTime.length)
    : 0;
  const avgQuestionTime = resultsWithTime.length > 0
    ? Math.round(resultsWithTime.reduce((sum, r) => sum + (r.timeTracking.averageTimePerQuestion || 0), 0) / resultsWithTime.length)
    : 0;

  // 📍 Location Analytics
  const resultsWithLocation = results.filter(r => r.location?.city);
  const cityStats = {};
  resultsWithLocation.forEach(r => {
    const city = r.location.city;
    if (!cityStats[city]) {
      cityStats[city] = { total: 0, sum: 0, count: 0 };
    }
    cityStats[city].count++;
    cityStats[city].sum += (r.score?.percent || 0);
    cityStats[city].total++;
  });
  const topCities = Object.entries(cityStats)
    .map(([name, stat]) => ({ name, avg: Math.round(stat.sum / stat.count), count: stat.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Category Distribution
  const categoryCount = {};
  questions.forEach(q => {
    const cat = q.category || 'Diğer';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const categories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);

  // 📊 Category Performance Analysis
  const categoryPerformance = {};
  results.forEach(r => {
    if (r.timeTracking?.questionTimes) {
      r.timeTracking.questionTimes.forEach(qt => {
        const cat = qt.category || 'Diğer';
        if (!categoryPerformance[cat]) {
          categoryPerformance[cat] = { 
            total: 0, 
            correct: 0, 
            totalTime: 0, 
            count: 0 
          };
        }
        categoryPerformance[cat].count++;
        categoryPerformance[cat].totalTime += qt.timeSpent;
        if (qt.correct) categoryPerformance[cat].correct++;
        categoryPerformance[cat].total++;
      });
    }
  });

  const categoryStats = Object.entries(categoryPerformance)
    .map(([name, stats]) => ({
      name,
      successRate: Math.round((stats.correct / stats.total) * 100),
      avgTime: Math.round(stats.totalTime / stats.count),
      count: stats.count,
      errorRate: 100 - Math.round((stats.correct / stats.total) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  // 🚨 Most Failed Categories
  const failedCategories = [...categoryStats]
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5);

  // ⏱️ Slowest Categories
  const slowestCategories = [...categoryStats]
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 5);

  // Difficulty Distribution
  const difficultyCount = { easy: 0, medium: 0, hard: 0 };
  questions.forEach(q => {
    if (q.difficulty) difficultyCount[q.difficulty]++;
  });

  // Store Performance
  const storeStats = {};
  results.forEach(r => {
    const store = r.employee?.store || 'Bilinmiyor';
    if (!storeStats[store]) storeStats[store] = { total: 0, sum: 0, count: 0 };
    storeStats[store].count++;
    storeStats[store].sum += (r.score?.percent || 0);
    storeStats[store].total++;
  });
  const stores = Object.entries(storeStats)
    .map(([name, stat]) => ({ name, avg: Math.round(stat.sum / stat.count), count: stat.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // Top Performers
  const performerStats = {};
  results.forEach(r => {
    const name = r.employee?.fullName || 'Bilinmiyor';
    const store = r.employee?.store || '';
    const key = name + '|' + store;
    if (!performerStats[key]) performerStats[key] = { name, store, sum: 0, count: 0 };
    performerStats[key].sum += (r.score?.percent || 0);
    performerStats[key].count++;
  });
  const topPerformers = Object.values(performerStats)
    .map(p => ({ ...p, avg: Math.round(p.sum / p.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // Recent Activity
  const recentResults = [...results]
    .sort((a, b) => {
      const aTime = a.submittedAt?.toDate?.() || new Date(0);
      const bTime = b.submittedAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    })
    .slice(0, 5);

  const formatTime = (seconds) => {
    if (!seconds) return '0 sn';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min === 0) return `${sec} sn`;
    return `${min} dk ${sec} sn`;
  };

  return (
    <Page title="Dashboard" subtitle="Genel Bakış ve İstatistikler">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <BookOpenIcon size={32} strokeWidth={1.5} className="text-primary-500" />
            <span className="text-xs text-dark-500">Soru Havuzu</span>
          </div>
          <div className="dashboard-kpi-number text-dark-900">{totalQuestions}</div>
          <div className="text-sm text-dark-600 mt-1">{activeQuestions} aktif</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <ChartBarIcon size={32} strokeWidth={1.5} className="text-secondary-500" />
            <span className="text-xs text-dark-500">Quiz Oturumları</span>
          </div>
          <div className="dashboard-kpi-number text-dark-900">{totalSessions}</div>
          <div className="text-sm text-dark-600 mt-1">{completedSessions} tamamlandı</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <ClockIcon size={32} strokeWidth={1.5} className="text-accent-500" />
            <span className="text-xs text-dark-500">Ortalama Süre</span>
          </div>
          <div className="dashboard-kpi-number text-secondary-600">{formatTime(avgQuizTime)}</div>
          <div className="text-sm text-dark-600 mt-1">{avgQuestionTime} sn/soru</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <TrophyIcon size={32} strokeWidth={1.5} className="text-primary-600" />
            <span className="text-xs text-dark-500">Ortalama Başarı</span>
          </div>
          <div className="dashboard-kpi-number" style={{ color: avgScore >= 70 ? '#5EC5B6' : avgScore >= 50 ? '#FF6B4A' : '#dc2626' }}>
            {avgScore}%
          </div>
          <div className="text-sm text-dark-600 mt-1">{totalResults} test</div>
        </div>
      </div>

      {/* Location Map - Full Width */}
      <div className="mb-6">
        <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><MapPinIcon size={20} strokeWidth={2} /> Lokasyon Dağılımı</h3>
        <LocationMap results={results} />
      </div>

      {/* City Performance */}
      {topCities.length > 0 && (
        <div className="card p-6 mb-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><MapPinIcon size={20} strokeWidth={2} /> Şehirlere Göre Performans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCities.map((city, idx) => (
              <div key={city.name} className="p-4 rounded-lg bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-dark-900">{city.name}</div>
                    <div className="text-xs text-dark-500">{city.count} test</div>
                  </div>
                </div>
                <div className="text-3xl font-black text-right" style={{ color: city.avg >= 70 ? '#5EC5B6' : city.avg >= 50 ? '#FF6B4A' : '#dc2626' }}>
                  {city.avg}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Category Performance */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><ChartBarIcon size={20} strokeWidth={2} /> Kategori Performansı</h3>
          {categoryStats.length === 0 ? (
            <p className="text-dark-500 text-center py-8">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.slice(0, 5).map(cat => {
                const percent = cat.successRate;
                return (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-dark-900">{cat.name}</span>
                      <span className="text-dark-600">{percent}% • {formatTime(cat.avgTime)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full"
                        style={{ 
                          width: percent + '%',
                          background: percent >= 70 ? 'linear-gradient(90deg, #5EC5B6, #3DA89C)' :
                                     percent >= 50 ? 'linear-gradient(90deg, #FF6B4A, #E84A28)' :
                                     'linear-gradient(90deg, #dc2626, #b91c1c)'
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-dark-500 mt-1">
                      {cat.count} soru çözüldü
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Most Failed Categories */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><ExclamationTriangleIcon size={20} strokeWidth={2} /> En Çok Yanlış Yapılan Konular</h3>
          {failedCategories.length === 0 ? (
            <p className="text-dark-500 text-center py-8">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {failedCategories.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-dark-900">{cat.name}</div>
                    <div className="text-xs text-dark-500">{cat.count} soru • {formatTime(cat.avgTime)} ortalama</div>
                  </div>
                  <div className="text-2xl font-black text-red-600">
                    {cat.errorRate}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Slowest Categories */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><ClockIcon size={20} strokeWidth={2} /> En Çok Süre Harcanan Konular</h3>
          {slowestCategories.length === 0 ? (
            <p className="text-dark-500 text-center py-8">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {slowestCategories.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-dark-900">{cat.name}</div>
                    <div className="text-xs text-dark-500">{cat.count} soru • {cat.successRate}% başarı</div>
                  </div>
                  <div className="text-2xl font-black text-orange-600">
                    {cat.avgTime} sn
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty Distribution */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><RocketLaunchIcon size={20} strokeWidth={2} /> Zorluk Dağılımı</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-accent-50 border-2 border-accent-200">
              <div className="text-3xl font-black text-accent-600">{difficultyCount.easy}</div>
              <div className="text-sm text-dark-600 mt-1">Kolay</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary-50 border-2 border-primary-200">
              <div className="text-3xl font-black text-primary-600">{difficultyCount.medium}</div>
              <div className="text-sm text-dark-600 mt-1">Orta</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50 border-2 border-red-200">
              <div className="text-3xl font-black text-red-600">{difficultyCount.hard}</div>
              <div className="text-sm text-dark-600 mt-1">Zor</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-dark-600">Toplam Soru</span>
              <span className="font-bold text-dark-900">{totalQuestions}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top Stores */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><HomeIcon size={20} strokeWidth={2} /> En Başarılı Mağazalar</h3>
          {stores.length === 0 ? (
            <p className="text-dark-500 text-center py-8">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {stores.map((store, idx) => (
                <div key={store.name} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-dark-900">{store.name}</div>
                    <div className="text-xs text-dark-500">{store.count} test</div>
                  </div>
                  <div className="text-2xl font-black" style={{ color: store.avg >= 70 ? '#5EC5B6' : store.avg >= 50 ? '#FF6B4A' : '#dc2626' }}>
                    {store.avg}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performers */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><SparklesIcon size={20} strokeWidth={2} /> En Başarılı Personeller</h3>
          {topPerformers.length === 0 ? (
            <p className="text-dark-500 text-center py-8">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((p, idx) => (
                <div key={p.name + p.store} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-dark-900">{p.name}</div>
                    <div className="text-xs text-dark-500">{p.store} • {p.count} test</div>
                  </div>
                  <div className="text-2xl font-black" style={{ color: p.avg >= 70 ? '#5EC5B6' : p.avg >= 50 ? '#FF6B4A' : '#dc2626' }}>
                    {p.avg}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2"><ClockIcon size={20} strokeWidth={2} /> Son Aktiviteler</h3>
        {recentResults.length === 0 ? (
          <p className="text-dark-500 text-center py-8">Henüz aktivite yok</p>
        ) : (
          <div className="space-y-3">
            {recentResults.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
                  {r.employee?.fullName?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-dark-900">{r.employee?.fullName || 'Personel'}</div>
                  <div className="text-xs text-dark-500">
                    {r.employee?.store || '-'} 
                    {r.location?.city && <span className="ml-2 inline-flex items-center gap-1"><MapPinIcon size={14} strokeWidth={2} /> {r.location.city}</span>}
                    {' • '} {fmtDate(r.submittedAt)}
                    {r.timeTracking?.totalTime && (
                      <span className="ml-2 inline-flex items-center gap-1"><ClockIcon size={14} strokeWidth={2} /> {formatTime(r.timeTracking.totalTime)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{ color: (r.score?.percent || 0) >= 70 ? '#5EC5B6' : (r.score?.percent || 0) >= 50 ? '#FF6B4A' : '#dc2626' }}>
                    {r.score?.percent || 0}%
                  </div>
                  <div className="text-xs text-dark-500">{r.score?.correct}/{r.score?.total}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
};

window.Dashboard = Dashboard;
