/* ============================================================
   coin.js — 업비트 실시간 코인 시세 (REST 스냅샷 + WebSocket)
   목록 렌더링은 quotes.js가 담당하고, 여기서는 시세 상태만 관리합니다.
   ============================================================ */
(function () {
  'use strict';

  const MP = window.MP;
  const COINS = [
    { market: 'KRW-BTC', ticker: 'BTC', name: '비트코인' },
    { market: 'KRW-ETH', ticker: 'ETH', name: '이더리움' },
    { market: 'KRW-XRP', ticker: 'XRP', name: '리플' },
    { market: 'KRW-SOL', ticker: 'SOL', name: '솔라나' },
    { market: 'KRW-DOGE', ticker: 'DOGE', name: '도지코인' },
    { market: 'KRW-ADA', ticker: 'ADA', name: '에이다' },
    { market: 'KRW-AVAX', ticker: 'AVAX', name: '아발란체' },
    { market: 'KRW-LINK', ticker: 'LINK', name: '체인링크' },
    { market: 'KRW-TRX', ticker: 'TRX', name: '트론' },
    { market: 'KRW-SUI', ticker: 'SUI', name: '수이' },
    { market: 'KRW-DOT', ticker: 'DOT', name: '폴카닷' },
    { market: 'KRW-BCH', ticker: 'BCH', name: '비트코인캐시' },
  ];
  const MARKETS = COINS.map((c) => c.market);
  const state = new Map();
  MP.COINS = COINS;
  MP.coinQuotes = state;

  let ws = null, wsRetry = 0, pollTimer = 0, flushTimer = 0, stopped = false;

  function apply(t) {
    const market = t.market || t.code;
    if (!market) return;
    state.set(market, {
      price: Number(t.trade_price),
      change: Number(t.signed_change_rate),
      acc: Number(t.acc_trade_price_24h || t.acc_trade_price),
      high: Number(t.high_price) || null,
      low: Number(t.low_price) || null,
    });
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = 0;
      MP.emit('tick');
      const sync = MP.$('#lastSync');
      if (sync) {
        const d = new Date();
        sync.textContent = '시세 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }
      const btc = state.get('KRW-BTC');
      if (btc) MP.emit('btc', { price: btc.price, changed: btc.change });
    }, 600);
  }

  async function snapshot() {
    try {
      const r = await fetch('https://api.upbit.com/v1/ticker?markets=' + encodeURIComponent(MARKETS.join(',')), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const arr = await r.json();
      if (Array.isArray(arr)) arr.forEach(apply);
    } catch (e) {
      console.warn('[coin] 시세 조회 실패', e);
    }
  }

  function connect() {
    if (stopped) return;
    try {
      ws = new WebSocket('wss://api.upbit.com/websocket/v1');
      ws.binaryType = 'arraybuffer';
    } catch (e) { fallback(); return; }

    ws.onopen = () => {
      wsRetry = 0;
      clearInterval(pollTimer);
      pollTimer = 0;
      ws.send(JSON.stringify([
        { ticket: 'market-pulse' },
        { type: 'ticker', codes: MARKETS, isOnlyRealtime: true },
        { format: 'DEFAULT' },
      ]));
    };

    ws.onmessage = async (ev) => {
      try {
        let text = ev.data;
        if (text && typeof text !== 'string') {
          text = text instanceof ArrayBuffer
            ? new TextDecoder('utf-8').decode(text)
            : await text.text();
        }
        const obj = JSON.parse(text);
        if (obj && obj.type === 'ticker') apply(obj);
      } catch (e) { /* 부분 프레임 무시 */ }
    };

    ws.onclose = () => {
      if (stopped) return;
      wsRetry += 1;
      if (wsRetry > 4) fallback();
      setTimeout(connect, Math.min(1000 * wsRetry, 8000));
    };
    ws.onerror = () => { /* onclose에서 재연결 */ };
  }

  function fallback() {
    if (pollTimer || stopped) return;
    pollTimer = setInterval(snapshot, 5000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    snapshot();
    connect();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      snapshot();
      if (!ws || ws.readyState > 1) { wsRetry = 0; connect(); }
    });
    window.addEventListener('beforeunload', () => { stopped = true; try { ws && ws.close(); } catch (e) {} });
  });
})();
