/* ============================================================
   watchlist.js — 관심종목 (localStorage 저장 · 메모 · 내보내기)
   좌측 리스트의 '관심' 탭에 1줄형으로 표시됩니다.
   ============================================================ */
(function () {
  'use strict';

  const MP = window.MP;
  const KEY = 'mp.watch';
  let watchTickTimer = 0;

  const load = () => {
    const arr = MP.store.get(KEY, []);
    return Array.isArray(arr) ? arr : [];
  };
  const save = (arr) => MP.store.set(KEY, arr);
  const nameOf = (symbol) => {
    const hit = MP.catalog.find((c) => c.symbol === symbol);
    return hit ? hit.name : symbol;
  };

  function priceText(symbol) {
    const m = symbol.match(/^UPBIT:([A-Z]+)KRW$/);
    if (m && MP.coinQuotes) {
      const q = MP.coinQuotes.get('KRW-' + m[1]);
      if (q) return MP.fmtPrice(q.price, q.price >= 100 ? 0 : 2);
    }
    const q = MP.quoteOf ? MP.quoteOf(symbol) : null;
    if (q && Number.isFinite(q.price)) {
      return (q.currency === 'USD' ? '$' : '') + MP.fmtPrice(q.price, q.price >= 1000 ? 0 : 2);
    }
    return '—';
  }

  function ratioOf(symbol) {
    const m = symbol.match(/^UPBIT:([A-Z]+)KRW$/);
    if (m && MP.coinQuotes) {
      const q = MP.coinQuotes.get('KRW-' + m[1]);
      if (q) return q.change * 100;
    }
    const q = MP.quoteOf ? MP.quoteOf(symbol) : null;
    return q ? q.ratio || 0 : 0;
  }

  /* ---------- 리스트 렌더 (quotes.js가 호출) ---------- */
  function render(el) {
    if (!el) return;
    const arr = load();
    if (!arr.length) {
      el.innerHTML =
        '<div class="empty">관심종목이 비어 있습니다.<br>' +
        '<span style="font-size:11.5px">아래 <b>빠른 추가</b> 버튼이나 종목 상세의 <b>★ 관심 담기</b>를 눌러보세요.</span></div>';
      return;
    }
    el.innerHTML = arr
      .map((it) => {
        const symbol = it.symbol;
        const ratio = ratioOf(symbol);
        const dir = MP.dir(ratio);
        const sel = MP.chartState && MP.chartState.symbol === symbol ? ' is-sel' : '';
        return (
          '<div class="row' + sel + '" data-symbol="' + MP.escape(symbol) + '" tabindex="0" role="button">' +
          '<div class="row-main">' +
          '<span class="row-name">' + MP.escape(it.label || nameOf(symbol)) + '</span>' +
          '<span class="row-code">' + MP.escape(symbol) + '</span>' +
          (it.note ? '<span class="row-note">' + MP.escape(it.note) + '</span>' : '') +
          '</div>' +
          '<span class="row-price">' + priceText(symbol) + '</span>' +
          '<div style="display:flex;align-items:center;gap:2px;justify-content:flex-end">' +
          '<span class="row-badge ' + dir + '" style="min-width:52px">' +
          (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–') + Math.abs(ratio).toFixed(2) + '%</span>' +
          '<button class="row-del" type="button" data-del="' + MP.escape(symbol) + '" aria-label="삭제">✕</button>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }
  MP.renderWatchRows = render;

  /* ---------- 추가/삭제 ---------- */
  function add(symbol, label) {
    const clean = String(symbol || '').trim().toUpperCase();
    if (!clean) { MP.toast('종목을 선택해 주세요'); return false; }
    const arr = load();
    if (arr.some((x) => x.symbol === clean)) { MP.toast('이미 담긴 종목입니다'); return false; }
    arr.unshift({ symbol: clean, label: label || nameOf(clean), note: '', addedAt: Date.now() });
    save(arr);
    MP.emit('list-refresh');
    MP.toast((label || nameOf(clean)) + ' 관심종목에 담았습니다');
    return true;
  }

  function remove(symbol) {
    const arr = load().filter((x) => x.symbol !== symbol);
    save(arr);
    MP.emit('list-refresh');
    MP.toast('관심종목에서 뺐습니다');
  }

  function setNote(symbol, note) {
    const arr = load();
    const it = arr.find((x) => x.symbol === symbol);
    if (!it) return;
    it.note = note;
    save(arr);
    MP.emit('list-refresh');
  }

  document.addEventListener('DOMContentLoaded', () => {
    MP.addWatch = add;
    MP.on('watch-remove', remove);

    const quick = MP.$('#quickAdd');
    if (quick) {
      quick.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-sym]');
        if (b) add(b.dataset.sym, b.textContent.trim());
      });
    }

    const clearBtn = MP.$('#watchClear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!load().length) { MP.toast('비울 종목이 없습니다'); return; }
        if (window.confirm('관심종목을 모두 삭제할까요? 되돌릴 수 없습니다.')) {
          save([]);
          MP.emit('list-refresh');
          MP.toast('관심종목을 모두 비웠습니다');
        }
      });
    }

    const expBtn = MP.$('#watchExport');
    if (expBtn) {
      expBtn.addEventListener('click', () => {
        const arr = load();
        if (!arr.length) { MP.toast('내보낼 종목이 없습니다'); return; }
        const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'market-pulse-watchlist-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        MP.toast('관심종목을 파일로 저장했습니다');
      });
    }

    // 메모: 관심 탭에서 행을 길게 눌러(더블클릭) 메모 편집
    const rows = MP.$('#rows');
    if (rows) {
      rows.addEventListener('dblclick', (e) => {
        const row = e.target.closest('.row');
        if (!row || !row.querySelector('.row-note, .row-main')) return;
        const symbol = row.dataset.symbol;
        if (!load().some((x) => x.symbol === symbol)) return;
        const cur = (load().find((x) => x.symbol === symbol) || {}).note || '';
        const next = window.prompt('매수 메모를 입력하세요 (비우면 삭제)', cur);
        if (next === null) return;
        setNote(symbol, next.trim());
        MP.toast('메모를 저장했습니다');
      });
    }

    MP.on('tick', () => {
      if (!MP.setMarketTab) return;
      const watchTab = document.querySelector('#marketTabs .mtab[data-tab="watch"].is-active');
      if (!watchTab) return;
      if (watchTickTimer) return;
      watchTickTimer = setTimeout(() => {
        watchTickTimer = 0;
        MP.emit('list-refresh');
      }, 2500);
    });
  });
})();
