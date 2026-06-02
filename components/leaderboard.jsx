const { useState, useEffect, useMemo } = React;

const lbNormalizeName = (n) => (n || '').trim().toLocaleLowerCase('tr-TR');

const lbRankBadge = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
};

// Single leaderboard row. compact -> sadece isim + puan (sınav sonrası ekran).
const LeaderboardRow = ({ row, highlight, compact }) => (
  <div className={'lb-row' + (highlight ? ' lb-row-me' : '') + (row.rank <= 3 ? ' lb-row-top' : '')}>
    <div className={'lb-rank lb-rank-' + (row.rank <= 3 ? row.rank : 'n')}>{lbRankBadge(row.rank)}</div>
    <div className="lb-person">
      <div className="lb-name">{row.name}{highlight ? <span className="lb-you">Sen</span> : null}</div>
      {!compact && (
        <div className="lb-meta">
          {row.examCount} sınav · En iyi %{row.bestPercent}
        </div>
      )}
    </div>
    <div className="lb-xp">
      <img className="lb-xp-icon" src="/assets/xp-icon.png" alt="" aria-hidden="true" />
      {window.formatXp(row.totalXp)}
    </div>
  </div>
);

const Leaderboard = ({ sessionId, resultId }) => {
  const isPostQuiz = !!resultId;
  const [loading, setLoading] = useState(true);
  const [allResults, setAllResults] = useState([]);
  const [me, setMe] = useState(null);
  const [range, setRange] = useState('all'); // 'daily' | 'weekly' | 'all'

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        let companyId = null;

        if (isPostQuiz) {
          const myResult = await window.db.getResultById(resultId);
          if (active) setMe(myResult || null);
          companyId = myResult?.companyId || null;
        } else {
          const u = getCurrentUser();
          if (u?.isSuperAdmin) {
            try {
              const sel = JSON.parse(localStorage.getItem('superadmin:selectedCompanyData') || 'null');
              companyId = (sel?.id && sel.id !== 'all') ? sel.id : null;
            } catch { companyId = null; }
          } else {
            companyId = u?.companyId || null;
          }
        }

        const results = await window.db.getResults(companyId ? { companyId } : {});
        if (!active) return;
        setAllResults(results);
      } catch (e) {
        window.devError('Leaderboard load error:', e);
        if (active) toast('Liderlik tablosu yüklenemedi', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [resultId, isPostQuiz]);

  // Tarih aralığına göre filtrele + topla. Sınav sonrası ekran her zaman "tüm zamanlar".
  const rows = useMemo(() => {
    let list = allResults;
    if (!isPostQuiz && range !== 'all') {
      const windowMs = range === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - windowMs;
      list = allResults.filter((r) => {
        const t = r?.submittedAt ? new Date(r.submittedAt).getTime() : 0;
        return t >= cutoff;
      });
    }
    return window.aggregateLeaderboard(list);
  }, [allResults, range, isPostQuiz]);

  if (loading) {
    return isPostQuiz ? (
      <div className="lb-screen">
        <LoadingSpinner text="Liderlik tablosu yükleniyor..." />
      </div>
    ) : (
      <Page title="Liderlik Tablosu">
        <LoadingSpinner text="Liderlik tablosu yükleniyor..." />
      </Page>
    );
  }

  // ---- Admin mode (sidebar page) ----
  if (!isPostQuiz) {
    const rangeLabels = { daily: 'Günlük', weekly: 'Haftalık', all: 'Tüm Zamanlar' };
    const emptyText = range === 'daily'
      ? 'Bugün henüz sonuç yok.'
      : range === 'weekly'
        ? 'Son 7 günde sonuç yok.'
        : 'Henüz sonuç yok.';
    return (
      <Page title="Liderlik Tablosu" subtitle="Çalışanların toplam puan sıralaması">
        <div className="lb-tabs" role="tablist">
          {['daily', 'weekly', 'all'].map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={range === key}
              className={'lb-tab' + (range === key ? ' active' : '')}
              onClick={() => setRange(key)}
            >
              {rangeLabels[key]}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="card p-8 text-center text-dark-500">{emptyText}</div>
        ) : (
          <div className="lb-list lb-list-admin">
            {rows.map((r) => <LeaderboardRow key={r.key} row={r} highlight={false} />)}
          </div>
        )}
      </Page>
    );
  }

  // ---- Post-quiz mode (katılımcı) ----
  const myName = lbNormalizeName(me?.employee?.fullName);
  const myIndex = rows.findIndex((r) => r.key === myName);
  const myRow = myIndex >= 0 ? rows[myIndex] : null;
  const earnedXp = Number(me?.score?.xp) || 0;

  // İlk 10 + (gerekirse) kendi satırını ayrıca göster
  const topRows = rows.slice(0, 10);
  const showMeSeparately = myRow && myIndex >= 10;

  return (
    <div className="lb-screen">
      <div className="lb-card">
        <div className="lb-hero">
          <div className="lb-hero-trophy">🏆</div>
          <div className="lb-hero-title">Tebrikler{me?.employee?.fullName ? `, ${me.employee.fullName}` : ''}!</div>
          <div className="lb-hero-earned">
            <span className="lb-hero-earned-num">
              <img className="lb-hero-earned-icon" src="/assets/xp-icon.png" alt="" aria-hidden="true" />
              +{earnedXp.toLocaleString('tr-TR')}
            </span>
            <span className="lb-hero-earned-label">puan kazandın</span>
          </div>
          {myRow ? (
            <div className="lb-standing">
              Sıralaman: <strong>#{myRow.rank}</strong> / {rows.length}
            </div>
          ) : null}
        </div>

        <div className="lb-list">
          {topRows.map((r) => (
            <LeaderboardRow key={r.key} row={r} highlight={r.key === myName} compact />
          ))}
          {showMeSeparately ? (
            <>
              <div className="lb-gap">···</div>
              <LeaderboardRow row={myRow} highlight={true} compact />
            </>
          ) : null}
        </div>

        <div className="lb-actions">
          <button
            className="btn btn-primary w-full"
            onClick={() => { window.location.hash = `#/result?sessionId=${sessionId || ''}&resultId=${resultId}`; }}
          >
            Kullanıcı Detayları Gör
          </button>
          <button
            className="btn btn-secondary w-full"
            onClick={() => { window.location.hash = '#/'; }}
          >
            Ana Sayfa
          </button>
        </div>
      </div>
    </div>
  );
};

window.Leaderboard = Leaderboard;
