const { useState, useEffect } = React;

const lbNormalizeName = (n) => (n || '').trim().toLocaleLowerCase('tr-TR');

const lbRankBadge = (rank) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
};

// Single leaderboard row
const LeaderboardRow = ({ row, highlight }) => (
  <div className={'lb-row' + (highlight ? ' lb-row-me' : '') + (row.rank <= 3 ? ' lb-row-top' : '')}>
    <div className={'lb-rank lb-rank-' + (row.rank <= 3 ? row.rank : 'n')}>{lbRankBadge(row.rank)}</div>
    <div className="lb-person">
      <div className="lb-name">{row.name}{highlight ? <span className="lb-you">Sen</span> : null}</div>
      <div className="lb-meta">
        {row.examCount} sınav · En iyi %{row.bestPercent}
      </div>
    </div>
    <div className="lb-xp">{window.formatXp(row.totalXp)}</div>
  </div>
);

const Leaderboard = ({ sessionId, resultId }) => {
  const isPostQuiz = !!resultId;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);

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
        setRows(window.aggregateLeaderboard(results));
      } catch (e) {
        window.devError('Leaderboard load error:', e);
        if (active) toast('Liderlik tablosu yüklenemedi', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [resultId, isPostQuiz]);

  if (loading) {
    return (
      <div className="lb-wrap">
        <LoadingSpinner text="Liderlik tablosu yükleniyor..." />
      </div>
    );
  }

  // ---- Admin mode (sidebar page) ----
  if (!isPostQuiz) {
    return (
      <Page title="Liderlik Tablosu" subtitle="Çalışanların tüm sınavlardaki toplam puan sıralaması">
        {rows.length === 0 ? (
          <div className="card p-8 text-center text-dark-500">Henüz sonuç yok.</div>
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
  const bd = me?.score?.xpBreakdown || {};

  // İlk 10 + (gerekirse) kendi satırını ayrıca göster
  const topRows = rows.slice(0, 10);
  const showMeSeparately = myRow && myIndex >= 10;

  return (
    <div className="lb-wrap">
      <div className="lb-card">
        <div className="lb-hero">
          <div className="lb-hero-trophy">🏆</div>
          <div className="lb-hero-title">Tebrikler{me?.employee?.fullName ? `, ${me.employee.fullName}` : ''}!</div>
          <div className="lb-hero-earned">
            <span className="lb-hero-earned-num">+{earnedXp.toLocaleString('tr-TR')}</span>
            <span className="lb-hero-earned-label">puan kazandın</span>
          </div>
          {(bd.easy || bd.medium || bd.hard) ? (
            <div className="lb-breakdown">
              {bd.easy ? <span className="lb-chip lb-chip-easy">Kolay ×{bd.easy}</span> : null}
              {bd.medium ? <span className="lb-chip lb-chip-medium">Orta ×{bd.medium}</span> : null}
              {bd.hard ? <span className="lb-chip lb-chip-hard">Zor ×{bd.hard}</span> : null}
            </div>
          ) : null}
          {myRow ? (
            <div className="lb-standing">
              Sıralaman: <strong>#{myRow.rank}</strong> / {rows.length} · Toplam {window.formatXp(myRow.totalXp)}
            </div>
          ) : null}
        </div>

        <div className="lb-list">
          {topRows.map((r) => (
            <LeaderboardRow key={r.key} row={r} highlight={r.key === myName} />
          ))}
          {showMeSeparately ? (
            <>
              <div className="lb-gap">···</div>
              <LeaderboardRow row={myRow} highlight={true} />
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
