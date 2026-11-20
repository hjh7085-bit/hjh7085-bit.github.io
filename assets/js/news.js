/* ============================================================
   news.js — 시장 뉴스 피드 (GitHub Actions가 15분마다 갱신하는 JSON)
   ============================================================ */
(function () {
  'use strict';

  const MP = window.MP;
  const ENDPOINT = 'data/news.json';
  const LABEL = { kr: '국내', us: '미국', crypto: '코인' };
  const STALE_MS = 1000 * 60 * 60 * 3; // 3시간 이상 지나면 안내

  let all = [];
  let filter = 'all';
  let listEl, updatedEl;

  const pct = (t) => t;

  function render() {
    if (!listEl) return;
    const items = filter === 'all' ? all : all.filter((x) => x.market === filter);
    if (!items.length) {
      listEl.innerHTML = '<p class="news-empty">표시할 뉴스가 없습니다. 잠시 후 새로고침해 주세요.</p>';
      return;
    }
    listEl.innerHTML = items
      .map((it) => {
        const src = it.source || '뉴스';
        const date = it.pubDate ? MP.timeAgo(it.pubDate) : '';
        return (
          '<a class="news-item" href="' + MP.escape(it.link) + '" target="_blank" rel="noopener nofollow">' +
          '<span class="news-market ' + MP.escape(it.market) + '">' + (LABEL[it.market] || '') + '</span>' +
          '<span class="news-title">' + MP.escape(it.title) + '</span>' +
          '<span class="news-time">' + MP.escape(date) + '</span>' +
          '</a>'
        );
      })
      .join('');
  }

  async function load() {
    try {
      const res = await fetch(ENDPOINT + '?v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      all = (json.items || []).filter((x) => x && x.title && x.link);
      all.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
      MP.newsItems = all;
      MP.emit('news', all);
      render();
      if (updatedEl) {
        const gen = json.generatedAt ? new Date(json.generatedAt) : null;
        if (gen) {
          const stale = Date.now() - gen.getTime() > STALE_MS;
          const t = gen.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          updatedEl.textContent = (stale ? '⚠ 마지막 수집 ' : '· 마지막 수집 ') + t + (stale ? ' (자동 갱신이 멈춘 상태일 수 있습니다)' : '');
        }
        updatedEl.style.color = 'var(--dim)';
      }
    } catch (e) {
      if (listEl) {
        listEl.innerHTML =
          '<p class="news-empty">뉴스를 불러오지 못했습니다.<br><span style="font-size:12px;color:var(--dim)">' +
          '네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.</span></p>';
      }
      if (updatedEl) updatedEl.textContent = '· 수집 데이터 없음';
      console.warn('[news] 로드 실패', pct(e));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    listEl = MP.$('#newsList');
    updatedEl = MP.$('#newsUpdated');
    if (!listEl) return;
    load();

    const tabs = MP.$('#newsTabs');
    if (tabs) {
      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('.news-tab');
        if (!b) return;
        filter = b.dataset.market;
        MP.$$('#newsTabs .news-tab').forEach((x) => x.classList.toggle('is-active', x === b));
        render();
      });
    }

    // 5분마다 조용히 새로고침
    setInterval(load, 1000 * 60 * 5);
  });
})();
