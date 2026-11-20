/* ============================================================
   quotes.js — 주요 지수 바 · 종목 1줄 리스트 · 시장 탭
   ============================================================ */
(function () {
  'use strict';

  const MP = window.MP;
  const ENDPOINT = 'data/quotes.json';
  const state = { index: [], kr: [], us: [], fx: [], generatedAt: null };
  let tab = 'watch';
  let themeFilter = null;

  const BAR_NAMES = ['코스피', '코스닥', '나스닥', 'S&P500', '비트코인', '원/달러'];
  const TITLES = { watch: '내 관심종목', kr: '국내 대표 종목', us: '미국 인기 종목', crypto: '업비트 원화마켓' };
  const SORTS = { watch: '내가 담은 순', kr: '등락률 순', us: '등락률 순', crypto: '24시간 거래대금 순' };

  const fmtPrice = (it) => {
    const p = it.price;
    if (!Number.isFinite(p)) return '—';
    if (it.currency === 'USD' || it.market === 'us') return '$' + MP.fmtPrice(p, 2);
    if (it.market === 'coin') return MP.fmtPrice(p, p >= 100 ? 0 : 2);
    if (it.market === 'kr-index' || it.market === 'fx') return MP.fmtPrice(p, 2);
    return MP.fmtPrice(p, p >= 1000 ? 0 : 2);
  };

  /* ---------- 지수 바 ---------- */
  function itemByName(list, name) {
    return list.find((x) => x.name === name) || null;
  }

  function renderIndexBar() {
    const box = MP.$('#indexBar');
    if (!box) return;
    const pool = state.index.concat(state.fx);
    const items = BAR_NAMES.map((n) => itemByName(pool, n)).filter(Boolean);
    box.innerHTML = items
      .map((it) => {
        const dir = MP.dir(it.ratio);
        const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';
        return (
          '<button class="idx" type="button" data-symbol="' + MP.escape(it.symbol) + '">' +
          '<span class="idx-name">' + MP.escape(it.name) + '</span>' +
          '<span class="idx-price">' + fmtPrice(it) + '</span>' +
          '<span class="idx-chg ' + dir + '">' + arrow + ' ' + Math.abs(it.ratio || 0).toFixed(2) + '%</span>' +
          '</button>'
        );
      })
      .join('');

    const up = MP.$('#indexUpdated');
    if (up && state.generatedAt) {
      const d = new Date(state.generatedAt);
      up.textContent = d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' 기준';
    }
  }

  /* ---------- 리스트 ---------- */
  function badge(ratio) {
    const dir = MP.dir(ratio);
    const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–';
    return '<span class="row-badge ' + dir + '">' + arrow + Math.abs(ratio || 0).toFixed(2) + '%</span>';
  }

  function rowHtml(o) {
    const sel = MP.chartState && MP.chartState.symbol === o.symbol ? ' is-sel' : '';
    return (
      '<div class="row' + sel + '" data-symbol="' + MP.escape(o.symbol) + '" data-name="' + MP.escape(o.name) + '" tabindex="0" role="button">' +
      '<div class="row-main"><span class="row-name">' + MP.escape(o.name) + '</span>' +
      '<span class="row-code">' + MP.escape(o.code || o.symbol) + '</span>' +
      (o.note ? '<span class="row-note">' + MP.escape(o.note) + '</span>' : '') + '</div>' +
      '<span class="row-price">' + o.price + '</span>' +
      (o.del ? '<button class="row-del" type="button" data-del="' + MP.escape(o.symbol) + '" aria-label="삭제">✕</button>' : badge(o.ratio)) +
      '</div>'
    );
  }

  function coinRow(c) {
    const q = MP.coinQuotes && MP.coinQuotes.get(c.market);
    const sym = 'UPBIT:' + c.ticker + 'KRW';
    const stat = MP.quoteOf ? MP.quoteOf(sym) : null;
    const price = q ? MP.fmtPrice(q.price, q.price >= 100 ? 0 : 2)
      : (stat && Number.isFinite(stat.price) ? MP.fmtPrice(stat.price, stat.price >= 100 ? 0 : 2) : '—');
    const ratio = q ? q.change * 100 : (stat ? stat.ratio : 0);
    return rowHtml({
      symbol: sym,
      name: c.name + ' ' + c.ticker,
      code: c.ticker,
      price: price,
      ratio: ratio,
    });
  }

  function themesOf(symbol) {
    const hit = (MP.catalog || []).find((c) => c.symbol === symbol);
    return (hit && hit.themes) || [];
  }

  function renderThemeBar() {
    const el = MP.$('#themeFilter');
    if (!el) return;
    const counts = {};
    (MP.catalog || []).forEach((c) => {
      if (c.market !== tab) return;
      (c.themes || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    });
    if (tab === 'watch') {
      el.innerHTML = '';
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const list = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 12);
    el.innerHTML = '<button type="button" class="ttag' + (themeFilter ? '' : ' is-active') + '" data-theme="">전체</button>' +
      list.map((t) => '<button type="button" class="ttag' + (themeFilter === t ? ' is-active' : '') + '" data-theme="' + MP.escape(t) + '">' +
        MP.escape(t) + ' <i>' + counts[t] + '</i>' + '</button>').join('');
  }

  function renderRows() {
    const el = MP.$('#rows');
    if (!el) return;
    const title = MP.$('#listTitle');
    if (title) title.textContent = (themeFilter && tab !== 'watch' ? '#' + themeFilter + ' · ' : '') + (TITLES[tab] || '');
    renderThemeBar();
    const sortEl = MP.$('#listSort');
    if (sortEl) sortEl.textContent = SORTS[tab] || '';
    const empty = MP.$('#rowsEmpty');

    if (tab === 'watch') {
      if (typeof MP.renderWatchRows === 'function') {
        MP.renderWatchRows(el);
      } else {
        el.innerHTML = '';
      }
      if (empty) empty.hidden = true;
      return;
    }

    if (empty) {
      empty.hidden = false;
      empty.textContent = '시세를 불러오는 중입니다…';
    }

    let html = '';
    if (tab === 'crypto') {
      const coins = (MP.COINS || []).filter((c) => !themeFilter || themesOf('UPBIT:' + String(c.market).split('-')[1] + 'KRW').indexOf(themeFilter) >= 0).slice().sort((a, b) => {
        const qa = MP.coinQuotes && MP.coinQuotes.get(a.market);
        const qb = MP.coinQuotes && MP.coinQuotes.get(b.market);
        return ((qb && qb.acc) || 0) - ((qa && qa.acc) || 0);
      });
      html = coins.map(coinRow).join('');
    } else {
      const list = (tab === 'kr' ? state.kr : state.us)
        .filter((it) => !themeFilter || themesOf(it.symbol).indexOf(themeFilter) >= 0)
        .slice().sort((a, b) => (b.ratio || 0) - (a.ratio || 0));
      html = list
        .map((it) => rowHtml({
          symbol: it.symbol,
          name: it.name,
          code: it.code,
          price: fmtPrice(it),
          ratio: it.ratio,
        }))
        .join('');
    }

    el.innerHTML = html || '<div class="empty">종목 데이터를 불러오지 못했습니다.</div>';
    if (empty) empty.hidden = !!html;
  }

  function setTab(next, opts) {
    tab = next;
    if (themeFilter && !(MP.catalog || []).some((c) => c.market === next && (c.themes || []).indexOf(themeFilter) >= 0)) {
      themeFilter = null;
    }
    MP.$$('#marketTabs .mtab').forEach((b) => {
      const on = b.dataset.tab === next;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    MP.$$('.nav-link[data-tab]').forEach((a) => a.classList.toggle('is-active', a.dataset.tab === next));
    MP.$$('.nav-link[data-nav="index"]').forEach((a) => a.classList.remove('is-active'));
    renderRows();
    if (opts && opts.scroll) {
      const el = document.getElementById('board');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ---------- 실시간 코인 반영 ---------- */
  function refreshLive() {
    if (tab === 'crypto') renderRows();
    // 지수 바의 비트코인 카드도 실시간으로 갱신
    const box = MP.$('#indexBar');
    if (!box || !MP.coinQuotes) return;
    const q = MP.coinQuotes.get('KRW-BTC');
    if (!q) return;
    const card = box.querySelector('[data-symbol="UPBIT:BTCKRW"]');
    if (!card) return;
    const dir = MP.dir(q.change);
    card.querySelector('.idx-price').textContent = MP.fmtPrice(q.price, 0);
    const chg = card.querySelector('.idx-chg');
    chg.className = 'idx-chg ' + dir;
    chg.textContent = (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–') + ' ' + Math.abs(q.change * 100).toFixed(2) + '%';
  }

  /* ---------- 로드 ---------- */
  async function load() {
    try {
      const r = await fetch(ENDPOINT + '?v=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const json = await r.json();
      state.index = json.index || [];
      state.kr = json.kr || [];
      state.us = json.us || [];
      state.fx = json.fx || [];
      state.generatedAt = json.generatedAt || null;
      renderIndexBar();
      renderRows();
      if (state.fx[0]) MP.emit('fx', state.fx[0].price);
      MP.emit('quotes', state);
    } catch (e) {
      const box = MP.$('#indexBar');
      if (box) box.innerHTML = '<p class="empty" style="grid-column:1/-1">지수 시세를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>';
      console.warn('[quotes] 로드 실패', e);
    }
  }

  MP.quoteOf = function (symbol) {
    return state.index.concat(state.kr, state.us, state.fx).find((x) => x.symbol === symbol) || null;
  };
  MP.quotes = state;
  MP.setMarketTab = setTab;

  document.addEventListener('DOMContentLoaded', () => {
    load();
    const initial = (new URLSearchParams(location.search).get('tab') || '').toLowerCase();
    setTab(['watch', 'kr', 'us', 'crypto'].indexOf(initial) >= 0 ? initial : 'kr');

    const tabs = MP.$('#marketTabs');
    if (tabs) tabs.addEventListener('click', (e) => {
      const b = e.target.closest('.mtab');
      if (b) setTab(b.dataset.tab);
    });

    MP.$$('.nav-link[data-tab]').forEach((a) => {
      a.addEventListener('click', () => setTab(a.dataset.tab));
    });

    const bar = MP.$('#indexBar');
    if (bar) bar.addEventListener('click', (e) => {
      const b = e.target.closest('.idx');
      if (b) MP.emit('select-symbol', b.dataset.symbol);
    });

    const rows = MP.$('#rows');
    if (rows) {
      rows.addEventListener('click', (e) => {
        const del = e.target.closest('[data-del]');
        if (del) {
          e.stopPropagation();
          MP.emit('watch-remove', del.dataset.del);
          return;
        }
        const row = e.target.closest('.row');
        if (row && row.dataset.symbol) MP.emit('select-symbol', row.dataset.symbol);
      });
      rows.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const row = e.target.closest('.row');
        if (row && row.dataset.symbol) MP.emit('select-symbol', row.dataset.symbol);
      });
    }

    const tfEl = MP.$('#themeFilter');
    if (tfEl) tfEl.addEventListener('click', (e) => {
      const b = e.target.closest('.ttag');
      if (!b) return;
      themeFilter = b.dataset.theme || null;
      renderRows();
    });

    MP.on('theme-filter', (t) => {
      themeFilter = t || null;
      if (themeFilter) {
        const target = ['kr', 'us', 'crypto'].find((m) =>
          (MP.catalog || []).some((c) => c.market === m && (c.themes || []).indexOf(themeFilter) >= 0));
        if (target && target !== tab) { setTab(target); return; }
      }
      renderRows();
    });

    MP.on('tick', refreshLive);
    MP.on('quotes', renderRows);
    MP.on('list-refresh', renderRows);
    MP.on('symbol-changed', () => {
      if (tab === 'watch') { renderRows(); return; }
      MP.$$('#rows .row').forEach((r) => {
        r.classList.toggle('is-sel', MP.chartState && r.dataset.symbol === MP.chartState.symbol);
      });
    });
  });
})();
