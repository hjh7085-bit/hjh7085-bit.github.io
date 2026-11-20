/* ============================================================
   app.js — 공통 유틸 · 테마 · 시장 상태 · 종목 카탈로그
   ============================================================ */
(function () {
  'use strict';

  const MP = (window.MP = window.MP || {});

  /* ---------- DOM 헬퍼 ---------- */
  MP.$ = (sel, root) => (root || document).querySelector(sel);
  MP.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- 숫자·시간 포맷 ---------- */
  const nf0 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  MP.fmtInt = (n) => (Number.isFinite(n) ? nf0.format(n) : '—');
  MP.fmtPrice = (n, decimals) => {
    if (!Number.isFinite(n)) return '—';
    if (typeof decimals === 'number') {
      return new Intl.NumberFormat('ko-KR', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }).format(n);
    }
    return n >= 1000 ? nf0.format(n) : nf2.format(n);
  };
  MP.fmtCompact = (n) => {
    if (!Number.isFinite(n)) return '—';
    const a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(1) + '조';
    if (a >= 1e8) return (n / 1e8).toFixed(1) + '억';
    if (a >= 1e4) return (n / 1e4).toFixed(0) + '만';
    return nf0.format(n);
  };
  MP.fmtPct = (r) => {
    if (!Number.isFinite(r)) return '—';
    const v = r * 100;
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  };
  MP.dir = (v) => (!Number.isFinite(v) || v === 0 ? 'flat' : v > 0 ? 'up' : 'down');

  const KST = 'Asia/Seoul';
  MP.kstParts = (d) => {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: KST, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d || new Date());
    const g = (t) => (f.find((p) => p.type === t) || {}).value;
    return { wd: g('weekday'), h: +g('hour'), m: +g('minute') };
  };
  MP.timeAgo = (iso) => {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const diff = (Date.now() - t) / 1000;
    if (diff < 60) return '방금';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
    return new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  };
  MP.escape = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 저장소 ---------- */
  MP.store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem(k);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  /* ---------- 토스트 ---------- */
  let toastEl = null, toastTimer = 0;
  MP.toast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  };

  /* ---------- 간단 이벤트 버스 ---------- */
  const subs = {};
  MP.on = (evt, fn) => { (subs[evt] = subs[evt] || []).push(fn); };
  MP.emit = (evt, data) => { (subs[evt] || []).forEach((f) => { try { f(data); } catch (e) { console.warn(e); } }); };

  /* ---------- 테마 ---------- */
  const root = document.documentElement;
  const THEME_KEY = 'mp.theme';
  const savedTheme = MP.store.get(THEME_KEY, null);
  if (savedTheme === 'dark' || savedTheme === 'light') root.setAttribute('data-theme', savedTheme);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
    root.setAttribute('data-theme', 'light');

  const savedUD = 'kr'; // 한국식 등락 색상 고정 (상승 빨강 / 하락 파랑)
  root.setAttribute('data-updown', savedUD);

  document.addEventListener('DOMContentLoaded', () => {
    MP.theme = root.getAttribute('data-theme');

    const themeBtn = MP.$('#themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        MP.theme = next;
        MP.store.set(THEME_KEY, next);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', next === 'dark' ? '#070a0f' : '#f4f6f9');
        MP.emit('theme', next); // 차트 위젯 재생성
      });
    }

    MP.year = document.getElementById('year');
    if (MP.year) MP.year.textContent = String(new Date().getFullYear());

    startClock();
    startStatus();
    startNavSpy();

    // URL에 ?symbol=이 있으면 차트가 그 종목으로 열리도록 전달
    const q = new URLSearchParams(location.search).get('symbol');
    if (q) MP.initialSymbol = q;
  });

  /* ---------- 시계 ---------- */
  function startClock() {
    const el = MP.$('#clock');
    if (!el) return;
    const f = new Intl.DateTimeFormat('ko-KR', {
      timeZone: KST, month: '2-digit', day: '2-digit', weekday: 'short',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const tick = () => { el.textContent = 'KST ' + f.format(new Date()); };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 국내·미국 장 상태 ---------- */
  function krStatus() {
    const { wd, h, m } = MP.kstParts();
    const weekend = wd === 'Sat' || wd === 'Sun';
    const mins = h * 60 + m;
    if (weekend) return { open: false, text: '주말 휴장' };
    if (mins >= 9 * 60 && mins < 15 * 60 + 30) return { open: true, text: '정규장 진행 중 (15:30 마감)' };
    if (mins >= 8 * 60 + 30 && mins < 9 * 60) return { open: true, text: '장전 동시호가 (09:00 개장)' };
    if (mins >= 15 * 60 + 30 && mins < 16 * 60) return { open: false, text: '시간외 단일가' };
    if (mins >= 16 * 60) return { open: false, text: '장 마감 · 내일 09:00 개장' };
    return { open: false, text: '개장 전 (09:00 개장)' };
  }

  /* 시간대 오프셋(분) 계산 — 해당 시간대의 벽시계 시간을 UTC로 본 값과의 차이 */
  function zoneOffsetMinutes(tz, date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return (asUTC - date.getTime()) / 60000;
  }

  /* 미국 동부 시간 hh:mm → 한국 시간 표기 */
  function etToKstText(hh, mm) {
    const now = new Date();
    const et = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
    const offET = zoneOffsetMinutes('America/New_York', now);
    const offKST = zoneOffsetMinutes('Asia/Seoul', now);
    const etAsUTC = Date.UTC(+et.year, +et.month - 1, +et.day, hh, mm);
    const kst = new Date(etAsUTC - offET * 60000 + offKST * 60000);
    const pad = (n) => String(n).padStart(2, '0');
    return pad(kst.getUTCHours()) + ':' + pad(kst.getUTCMinutes());
  }

  function usStatus() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const g = (t) => (parts.find((p) => p.type === t) || {}).value;
    const wd = g('weekday'), h = +g('hour') % 24, m = +g('minute');
    const weekend = wd === 'Sat' || wd === 'Sun';
    const mins = h * 60 + m;
    if (weekend) return { open: false, text: '주말 휴장 (월요일 개장)' };
    if (mins >= 570 && mins < 960) return { open: true, text: '정규장 진행 중 · 한국시간 ' + etToKstText(16, 0) + ' 마감' };
    if (mins >= 240 && mins < 570) return { open: false, text: '프리마켓 · 한국시간 ' + etToKstText(9, 30) + ' 정규장 개장' };
    if (mins >= 960 && mins < 1200) return { open: false, text: '애프터마켓 진행 중' };
    return { open: false, text: '장 마감 · 한국시간 ' + etToKstText(9, 30) + ' 개장' };
  }

  function startStatus() {
    const kDot = MP.$('#dot-kr'), kTxt = MP.$('#st-kr');
    const uDot = MP.$('#dot-us'), uTxt = MP.$('#st-us');
    const paint = () => {
      const k = krStatus(), u = usStatus();
      if (kDot) kDot.className = 'dot ' + (k.open ? 'on' : 'off');
      if (kTxt) kTxt.textContent = k.text;
      if (uDot) uDot.className = 'dot ' + (u.open ? 'on' : 'off');
      if (uTxt) uTxt.textContent = u.text;
    };
    paint();
    setInterval(paint, 30000);
  }

  /* ---------- 스크롤 스파이 ---------- */
  function startNavSpy() {
    const links = MP.$$('.nav-link').filter((a) => !a.hasAttribute('data-tab'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach((a) => {
      const id = a.getAttribute('data-nav');
      const sec = document.getElementById(id);
      if (sec) map.set(sec, a);
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          if (e.target.id === 'market' && MP.$('.nav-link[data-tab].is-active')) return;
          links.forEach((l) => l.classList.remove('is-active'));
          const a = map.get(e.target);
          if (a) a.classList.add('is-active');
        });
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: 0 }
    );
    map.forEach((_a, sec) => io.observe(sec));
  }

  /* ---------- TradingView 위젯 로더 ---------- */
  const TV_BASE = 'https://s3.tradingview.com/external-embedding/';
  MP.tvWidget = function (mount, file, config) {
    if (!mount) return;
    mount.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'tradingview-widget-container';
    box.style.height = '100%';
    box.style.width = '100%';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.height = '100%';
    inner.style.width = '100%';
    box.appendChild(inner);
    const s = document.createElement('script');
    s.src = TV_BASE + file;
    s.type = 'text/javascript';
    s.async = true;
    s.textContent = JSON.stringify(config);
    box.appendChild(s);
    mount.appendChild(box);
  };

  /* ---------- 종목 카탈로그 ---------- */
  MP.catalog = [
    // 국내
    { symbol: 'KRX:005930', name: '삼성전자', code: '005930', market: 'kr', themes: ['반도체', 'HBM', 'AI'] },
    { symbol: 'KRX:000660', name: 'SK하이닉스', code: '000660', market: 'kr', themes: ['반도체', 'HBM', 'AI'] },
    { symbol: 'KRX:373220', name: 'LG에너지솔루션', code: '373220', market: 'kr', themes: ['2차전지', '배터리'] },
    { symbol: 'KRX:207940', name: '삼성바이오로직스', code: '207940', market: 'kr', themes: ['바이오', 'CDMO'] },
    { symbol: 'KRX:005380', name: '현대차', code: '005380', market: 'kr', themes: ['자동차', '로봇'] },
    { symbol: 'KRX:000270', name: '기아', code: '000270', market: 'kr', themes: ['자동차', '친환경차'] },
    { symbol: 'KRX:068270', name: '셀트리온', code: '068270', market: 'kr', themes: ['바이오', '제약'] },
    { symbol: 'KRX:005490', name: 'POSCO홀딩스', code: '005490', market: 'kr', themes: ['철강', '2차전지'] },
    { symbol: 'KRX:035420', name: 'NAVER', code: '035420', market: 'kr', themes: ['인터넷', 'AI'] },
    { symbol: 'KRX:035720', name: '카카오', code: '035720', market: 'kr', themes: ['인터넷', '플랫폼'] },
    { symbol: 'KRX:006400', name: '삼성SDI', code: '006400', market: 'kr', themes: ['2차전지', '배터리'] },
    { symbol: 'KRX:105560', name: 'KB금융', code: '105560', market: 'kr', themes: ['금융', '은행'] },
    { symbol: 'KRX:012450', name: '한화에어로스페이스', code: '012450', market: 'kr', themes: ['방산', '우주항공'] },
    { symbol: 'KRX:034020', name: '두산에너빌리티', code: '034020', market: 'kr', themes: ['원전', '에너지'] },
    { symbol: 'KRX:329180', name: 'HD현대중공업', code: '329180', market: 'kr', themes: ['조선', '방산'] },
    { symbol: 'KRX:247540', name: '에코프로비엠', code: '247540', market: 'kr', themes: ['2차전지', '양극재'] },
    { symbol: 'KRX:196170', name: '알테오젠', code: '196170', market: 'kr', themes: ['바이오', '제약'] },
    { symbol: 'KRX:051910', name: 'LG화학', code: '051910', market: 'kr', themes: ['화학', '2차전지'] },
    { symbol: 'KRX:259960', name: '크래프톤', code: '259960', market: 'kr', themes: ['게임', '콘텐츠'] },
    { symbol: 'KRX:042700', name: '한미반도체', code: '042700', market: 'kr', themes: ['반도체', '장비'] },
    { symbol: 'KRX:KOSPI', name: '코스피 지수', code: 'KOSPI', market: 'kr', themes: ['지수', '국내'] },
    { symbol: 'KRX:KOSDAQ', name: '코스닥 지수', code: 'KOSDAQ', market: 'kr', themes: ['지수', '국내'] },
    // 미국
    { symbol: 'NASDAQ:NVDA', name: '엔비디아', code: 'NVDA', market: 'us', themes: ['AI반도체', '데이터센터'] },
    { symbol: 'NASDAQ:TSLA', name: '테슬라', code: 'TSLA', market: 'us', themes: ['전기차', '자율주행'] },
    { symbol: 'NASDAQ:AAPL', name: '애플', code: 'AAPL', market: 'us', themes: ['소비자전자', 'AI'] },
    { symbol: 'NASDAQ:MSFT', name: '마이크로소프트', code: 'MSFT', market: 'us', themes: ['클라우드', 'AI'] },
    { symbol: 'NASDAQ:GOOGL', name: '알파벳(구글)', code: 'GOOGL', market: 'us', themes: ['인터넷', 'AI'] },
    { symbol: 'NASDAQ:AMZN', name: '아마존', code: 'AMZN', market: 'us', themes: ['이커머스', '클라우드'] },
    { symbol: 'NASDAQ:META', name: '메타', code: 'META', market: 'us', themes: ['SNS', 'AI'] },
    { symbol: 'NASDAQ:AMD', name: 'AMD', code: 'AMD', market: 'us', themes: ['AI반도체', '데이터센터'] },
    { symbol: 'NASDAQ:AVGO', name: '브로드컴', code: 'AVGO', market: 'us', themes: ['반도체', 'AI'] },
    { symbol: 'NYSE:TSM', name: 'TSMC', code: 'TSM', market: 'us', themes: ['반도체', '파운드리'] },
    { symbol: 'NASDAQ:PLTR', name: '팔란티어', code: 'PLTR', market: 'us', themes: ['소프트웨어', 'AI'] },
    { symbol: 'NASDAQ:COIN', name: '코인베이스', code: 'COIN', market: 'us', themes: ['코인', '핀테크'] },
    { symbol: 'NASDAQ:MSTR', name: '스트래티지(마이크로스트래티지)', code: 'MSTR', market: 'us', themes: ['코인', '소프트웨어'] },
    { symbol: 'NASDAQ:NFLX', name: '넷플릭스', code: 'NFLX', market: 'us', themes: ['콘텐츠', '미디어'] },
    { symbol: 'NYSE:JPM', name: 'JP모건', code: 'JPM', market: 'us', themes: ['금융', '은행'] },
    { symbol: 'NYSE:XOM', name: '엑슨모빌', code: 'XOM', market: 'us', themes: ['에너지', '석유'] },
    { symbol: 'AMEX:SPY', name: 'S&P500 ETF', code: 'SPY', market: 'us', themes: ['ETF', '지수'] },
    { symbol: 'NASDAQ:QQQ', name: '나스닥100 ETF', code: 'QQQ', market: 'us', themes: ['ETF', '지수'] },
    { symbol: 'NASDAQ:IXIC', name: '나스닥 종합지수', code: 'IXIC', market: 'us', themes: ['지수', '미국'] },
    { symbol: 'SP:SPX', name: 'S&P500 지수', code: 'SPX', market: 'us', themes: ['지수', '미국'] },
    // 코인
    { symbol: 'UPBIT:BTCKRW', name: '비트코인 (원화)', code: 'BTC', market: 'crypto', themes: ['레이어1', '결제'] },
    { symbol: 'UPBIT:ETHKRW', name: '이더리움 (원화)', code: 'ETH', market: 'crypto', themes: ['레이어1', '스마트컨트랙트'] },
    { symbol: 'UPBIT:XRPKRW', name: '리플 (원화)', code: 'XRP', market: 'crypto', themes: ['결제', '레이어1'] },
    { symbol: 'UPBIT:SOLKRW', name: '솔라나 (원화)', code: 'SOL', market: 'crypto', themes: ['레이어1', 'DeFi'] },
    { symbol: 'UPBIT:DOGEKRW', name: '도지코인 (원화)', code: 'DOGE', market: 'crypto', themes: ['밈코인', '결제'] },
    { symbol: 'BINANCE:BTCUSDT', name: '비트코인 (USDT)', code: 'BTCUSDT', market: 'crypto', themes: ['레이어1', '결제'] },
    { symbol: 'BINANCE:ETHUSDT', name: '이더리움 (USDT)', code: 'ETHUSDT', market: 'crypto', themes: ['레이어1', '스마트컨트랙트'] },
  ];

  MP.searchSymbols = function (q, limit) {
    const raw = String(q || '').trim();
    if (!raw) return [];
    const s = raw.toLowerCase().replace(/\s+/g, '');
    const scored = [];
    MP.catalog.forEach((it) => {
      const fields = [it.name.toLowerCase(), it.code.toLowerCase(), it.symbol.toLowerCase()];
      let score = 0;
      if (fields[1] === s || fields[2] === s) score = 100;
      else if (fields[1].startsWith(s)) score = 80;
      else if (fields[0].includes(s)) score = 60;
      else if (fields[1].includes(s)) score = 40;
      if (score) scored.push({ it, score });
    });
    scored.sort((a, b) => b.score - a.score);
    const out = scored.slice(0, limit || 8).map((x) => x.it);

    // 카탈로그에 없는 입력도 심볼로 열 수 있게 제안
    const looksLikeSymbol = /^[A-Za-z0-9:\-\.^/]{2,20}$/.test(raw) && !out.some((o) => o.code.toLowerCase() === s);
    if (looksLikeSymbol) {
      if (/^\d{6}$/.test(raw)) out.unshift({ symbol: 'KRX:' + raw, name: '국내 종목 코드 ' + raw, code: raw, market: 'kr' });
      else if (raw.includes(':')) out.unshift({ symbol: raw.toUpperCase(), name: '직접 입력 심볼', code: raw, market: 'us' });
      else if (/^[A-Za-z]{1,5}$/.test(raw))
        out.unshift({ symbol: 'NASDAQ:' + raw.toUpperCase(), name: '나스닥 ' + raw.toUpperCase() + ' (심볼 직접 입력)', code: raw.toUpperCase(), market: 'us' });
    }
    return out.slice(0, limit || 8);
  };
})();
