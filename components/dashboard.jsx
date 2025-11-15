const { useState, useEffect } = React;

const Dashboard = () => {
  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    await waitFirebase();
    const { db, collection, getDocs, query, where } = window.firebase;
    try {
      // 🔒 Super admin seçtiği şirkete göre, admin kendi şirketini görür
      const currentUser = getCurrentUser();

      // Logout sırasında query çalıştırma
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Get company identifiers for backward compatibility (checks both ID and name)
      const companyIdentifiers = getCompanyIdentifiersForQuery();

      let qSnap, sSnap, rSnap;

      if (companyIdentifiers === null) {
        // Super admin: Tüm şirketlerin verileri
        [qSnap, sSnap, rSnap] = await Promise.all([
          getDocs(collection(db, 'questions')),
          getDocs(collection(db, 'quizSessions')),
          getDocs(collection(db, 'results'))
        ]);
      } else if (companyIdentifiers.length === 0) {
        // No company assigned - return empty results
        qSnap = { docs: [] };
        sSnap = { docs: [] };
        rSnap = { docs: [] };
      } else {
        // Filter by company (checks both ID and name for backward compatibility)
        [qSnap, sSnap, rSnap] = await Promise.all([
          getDocs(query(collection(db, 'questions'), where('company', 'in', companyIdentifiers))),
          getDocs(query(collection(db, 'quizSessions'), where('company', 'in', companyIdentifiers))),
          getDocs(query(collection(db, 'results'), where('company', 'in', companyIdentifiers)))
        ]);
      }

      setQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSessions(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setResults(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) {
      window.devError('Dashboard load error:', e);
      toast('Dashboard yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Super admin şirket değiştirdiğinde yeniden yükle
    const handleCompanyChange = () => {
      loadData();
    };

    window.addEventListener('company-changed', handleCompanyChange);
    return () => window.removeEventListener('company-changed', handleCompanyChange);
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

  // Difficulty Distribution with Category Breakdown
  const difficultyCount = { easy: 0, medium: 0, hard: 0 };
  const difficultyByCategory = { easy: {}, medium: {}, hard: {} };

  questions.forEach(q => {
    if (q.difficulty) {
      difficultyCount[q.difficulty]++;

      // Track category breakdown for each difficulty
      const category = q.category || 'Diğer';
      if (!difficultyByCategory[q.difficulty][category]) {
        difficultyByCategory[q.difficulty][category] = 0;
      }
      difficultyByCategory[q.difficulty][category]++;
    }
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
      {/* KPI Cards - Professional Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Soru Havuzu Card */}
        <div className="card p-6 bg-gradient-to-br from-primary-50 to-white border-2 border-primary-100 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
              <span className="text-3xl">📚</span>
            </div>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">Soru Havuzu</span>
          </div>
          <div className="dashboard-kpi-number text-primary-600 mb-1">{totalQuestions}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-600">{activeQuestions} aktif soru</span>
            <span className="text-xs text-primary-500 font-semibold">●●●</span>
          </div>
        </div>

        {/* Quiz Oturumları Card */}
        <div className="card p-6 bg-gradient-to-br from-secondary-50 to-white border-2 border-secondary-100 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl shadow-lg">
              <span className="text-3xl">📊</span>
            </div>
            <span className="px-3 py-1 bg-secondary-100 text-secondary-700 text-xs font-semibold rounded-full">Quiz Oturumları</span>
          </div>
          <div className="dashboard-kpi-number text-secondary-600 mb-1">{totalSessions}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-600">{completedSessions} tamamlandı</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 bg-secondary-400 rounded-full" style={{ height: `${8 + i * 3}px` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Ortalama Süre Card */}
        <div className="card p-6 bg-gradient-to-br from-accent-50 to-white border-2 border-accent-100 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl shadow-lg">
              <span className="text-3xl">⏱️</span>
            </div>
            <span className="px-3 py-1 bg-accent-100 text-accent-700 text-xs font-semibold rounded-full">Ortalama Süre</span>
          </div>
          <div className="dashboard-kpi-number text-accent-600 mb-1">{formatTime(avgQuizTime)}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-600">{avgQuestionTime} sn/soru</span>
            <ClockIcon size={18} strokeWidth={2} className="text-accent-400" />
          </div>
        </div>

        {/* Ortalama Başarı Card */}
        <div className="card p-6 bg-gradient-to-br from-green-50 to-white border-2 border-green-100 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
              <span className="text-3xl">{avgScore >= 70 ? '🏆' : avgScore >= 50 ? '⭐' : '📈'}</span>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Ortalama Başarı</span>
          </div>
          <div className="dashboard-kpi-number mb-1" style={{ color: avgScore >= 70 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444' }}>
            {avgScore}%
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-600">{totalResults} test</span>
            <div className="flex items-center gap-1">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${avgScore}%`,
                  background: avgScore >= 70 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444'
                }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Map & City Performance - Side by Side */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Location Map - Square with rounded corners */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2">
            <MapPinIcon size={20} strokeWidth={2} /> Lokasyon Dağılımı
          </h3>
          <div style={{ aspectRatio: '1 / 1', borderRadius: '16px', overflow: 'hidden' }}>
            <LocationMap results={results} />
          </div>
        </div>

        {/* City Performance - Table View */}
        {topCities.length > 0 && (
          <div className="card p-6">
            <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2">
              <MapPinIcon size={20} strokeWidth={2} /> Şehirlere Göre Performans
            </h3>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-700 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-700 uppercase tracking-wider">Şehir</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-dark-700 uppercase tracking-wider">Test</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-dark-700 uppercase tracking-wider">Başarı</th>
                  </tr>
                </thead>
                <tbody>
                  {topCities.map((city, idx) => (
                    <tr key={city.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xs">
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-dark-900">{city.name}</td>
                      <td className="px-4 py-3 text-sm text-center text-dark-600">{city.count}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-2xl font-black" style={{ color: city.avg >= 70 ? '#5EC5B6' : city.avg >= 50 ? '#FF6B4A' : '#dc2626' }}>
                          {city.avg}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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

        {/* Difficulty Distribution - Vertical Cards */}
        <div className="card p-6">
          <h3 className="dashboard-section-title text-dark-900 mb-4 flex items-center gap-2">
            <RocketLaunchIcon size={20} strokeWidth={2} /> Zorluk Dağılımı
          </h3>
          <div className="flex flex-col gap-4">
            {/* Easy Card - 1:1 Ratio */}
            <div className="rounded-xl bg-accent-50 border-2 border-accent-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-4xl font-black text-accent-600">{difficultyCount.easy}</div>
                    <div className="text-sm font-semibold text-dark-600 mt-1">Kolay Sorular</div>
                  </div>
                  <div className="text-5xl">😊</div>
                </div>
                {Object.keys(difficultyByCategory.easy).length > 0 && (
                  <div className="pt-3 border-t border-accent-300">
                    <div className="text-xs font-semibold text-dark-500 mb-2">Kategoriler:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(difficultyByCategory.easy).map(([cat, count]) => (
                        <span key={cat} className="px-2 py-1 text-xs bg-white rounded-lg border border-accent-300 text-dark-700">
                          {cat}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Medium Card - 1:1 Ratio */}
            <div className="rounded-xl bg-primary-50 border-2 border-primary-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-4xl font-black text-primary-600">{difficultyCount.medium}</div>
                    <div className="text-sm font-semibold text-dark-600 mt-1">Orta Sorular</div>
                  </div>
                  <div className="text-5xl">🤔</div>
                </div>
                {Object.keys(difficultyByCategory.medium).length > 0 && (
                  <div className="pt-3 border-t border-primary-300">
                    <div className="text-xs font-semibold text-dark-500 mb-2">Kategoriler:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(difficultyByCategory.medium).map(([cat, count]) => (
                        <span key={cat} className="px-2 py-1 text-xs bg-white rounded-lg border border-primary-300 text-dark-700">
                          {cat}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hard Card - 1:1 Ratio */}
            <div className="rounded-xl bg-red-50 border-2 border-red-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-4xl font-black text-red-600">{difficultyCount.hard}</div>
                    <div className="text-sm font-semibold text-dark-600 mt-1">Zor Sorular</div>
                  </div>
                  <div className="text-5xl">🔥</div>
                </div>
                {Object.keys(difficultyByCategory.hard).length > 0 && (
                  <div className="pt-3 border-t border-red-300">
                    <div className="text-xs font-semibold text-dark-500 mb-2">Kategoriler:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(difficultyByCategory.hard).map(([cat, count]) => (
                        <span key={cat} className="px-2 py-1 text-xs bg-white rounded-lg border border-red-300 text-dark-700">
                          {cat}: <strong>{count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Summary */}
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
