/* ============================================================
   terminal.js — 알파스퀘어형 차트 워크스테이션
   · TradingView Lightweight Charts 엔진 (한국식 색상)
   · 11개 타임프레임 (코인=업비트 캔들 API, 주식=일/주/월)
   · 보조지표: MA5/20/60/120, 볼린저, 거래량, RSI, MACD
   · 그리기: 추세선·수평선·수직선·피보나치·사각형·텍스트·되돌리기
   ============================================================ */
(function () {
  'use strict';

  const MP = window.MP;
  const LWC = window.LightweightCharts;
  if (!MP || !LWC) return;

  const KST_SHIFT = 9 * 3600; // 초 단위 표시 보정

  const state = {
    symbol: 'UPBIT:BTCKRW',
    name: '비트코인',
    market: 'crypto',
    tf: 'D',
    inds: { ma5: true, ma10: false, ma20: true, ma60: true, ma120: false, ema: false, bb: false, ichi: false, vol: true, rsi: false, macd: false, stoch: false, atr: false },
    tool: 'cross',
  };

  const barCache = new Map();
  const intraCache = new Map();
  const stores = {};
  let mainChart, candleSeries, volSeries;
  const maSeries = {}, bbSeries = {};
  let rsiChart, rsiSeries, macdChart, macdHist, macdLine, macdSig;
  let stochChart, stochK, stochD, atrChart, atrSeries;
  const emaSeries = {}, ichiSeries = {};
  let syncing = false;
  let bars = [];
  let drawings = [];
  let pending = null;
  let channelDraft = null;
  let drawLayer, drawCtx, chartMain;
  let scenarioData = null;
  const scenSeries = {};

  const isCoin = (s) => /^UPBIT:|^BINANCE:/i.test(s || state.symbol);
  const isKR = (s) => /^KRX:/i.test(s || state.symbol);
  const isStock = (s) => !isCoin(s);

  const TF_LABEL = { '1': '1분', '3': '3분', '5': '5분', '10': '10분', '15': '15분', '30': '30분', '60': '1시간', '240': '4시간', D: '일봉', W: '주봉', M: '월봉' };

  /* ---------- 색상 ---------- */
  function cv(name, fb) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  function palette() {
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      up: cv('--up', '#E12343'),
      down: cv('--down', '#1763E6'),
      text: cv('--text', '#101828'),
      muted: cv('--muted', '#667085'),
      grid: light ? 'rgba(16,24,40,.055)' : 'rgba(255,255,255,.05)',
      border: cv('--border', '#E4E9F2'),
      bg: cv('--panel', '#fff'),
      ma5: '#F59E0B',
      ma20: '#8B5CF6',
      ma60: '#06B6D4',
      ma120: '#94A3B8',
      bb: 'rgba(37,99,235,.55)',
      rsi: '#7C3AED',
      macd: '#2563EB',
      signal: '#F59E0B',
      hist_up: light ? 'rgba(225,35,67,.55)' : 'rgba(240,68,82,.6)',
      hist_dn: light ? 'rgba(23,99,230,.55)' : 'rgba(59,130,246,.6)',
    };
  }

  /* ---------- 데이터 ---------- */
  function loadStore(file) {
    if (stores[file]) return Promise.resolve(stores[file]);
    return fetch('data/charts-' + file + '.json?v=' + Date.now(), { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((j) => { stores[file] = j; return j; });
  }

  function dayKey(tsMs) {
    const d = new Date(tsMs + KST_SHIFT * 1000);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
  }

  function aggregate(list, mode) {
    const out = [];
    let curKey = null, cur = null;
    list.forEach((b) => {
      const d = new Date(b.time * 1000);
      let key;
      if (mode === 'W') {
        const day = (d.getUTCDay() + 6) % 7;
        key = Math.floor((b.time - day * 86400) / 604800);
      } else {
        key = d.getUTCFullYear() * 12 + d.getUTCMonth();
      }
      if (key !== curKey) {
        cur = { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume };
        out.push(cur);
        curKey = key;
      } else {
        cur.high = Math.max(cur.high, b.high);
        cur.low = Math.min(cur.low, b.low);
        cur.close = b.close;
        cur.volume += b.volume;
      }
    });
    return out;
  }

  async function upbitCandles(symbol, tf) {
    const m = symbol.match(/^UPBIT:([A-Z]+)KRW$/);
    if (!m) return null;
    const market = 'KRW-' + m[1];
    let path;
    if (['1', '3', '5', '10', '15', '30'].indexOf(tf) >= 0) path = '/v1/candles/minutes/' + tf;
    else if (tf === '60') path = '/v1/candles/minutes/60';
    else if (tf === '240') path = '/v1/candles/minutes/240';
    else if (tf === 'D') path = '/v1/candles/days';
    else if (tf === 'W') path = '/v1/candles/weeks';
    else path = '/v1/candles/months';

    const url = 'https://api.upbit.com' + path + '?market=' + market + '&count=200';
    let lastErr = null;
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const rows = await r.json();
        return rows.map((c) => {
          const t = Math.floor(new Date(c.candle_date_time_utc + 'Z').getTime() / 1000);
          return {
            time: t + (tf === 'D' || tf === 'W' || tf === 'M' ? 0 : KST_SHIFT) + (tf === 'D' || tf === 'W' || tf === 'M' ? KST_SHIFT : 0),
            open: c.opening_price, high: c.high_price, low: c.low_price, close: c.trade_price,
            volume: c.candle_acc_trade_volume,
          };
        }).reverse();
      } catch (e) {
        lastErr = e;
        await new Promise((res) => setTimeout(res, 600));
      }
    }
    console.warn('[chart] 업비트 캔들 실패', lastErr);
    return null;
  }

  async function getBars(symbol, tf) {
    const key = symbol + '|' + tf;
    if (barCache.has(key)) return barCache.get(key);

    let out = null;
    if (isCoin(symbol)) {
      out = await upbitCandles(symbol, tf);
      if (!out) {
        // 실패 시 정적 일봉으로 대체
        const st = await loadStore('coin').catch(() => null);
        const s = st && st.series && st.series[symbol];
        if (s) out = s.bars.map((b) => ({ time: dayKey(b[0]), open: b[1], high: b[2], low: b[3], close: b[4], volume: b[5] }));
      }
    } else {
      const st = await loadStore(isKR(symbol) ? 'kr' : 'us');
      const s = st.series && st.series[symbol];
      if (!s) return null;
      const daily = s.bars.map((b) => ({ time: dayKey(b[0]), open: b[1], high: b[2], low: b[3], close: b[4], volume: b[5] }));
      if (['D', 'W', 'M'].indexOf(tf) >= 0) {
        out = tf === 'D' ? daily : aggregate(daily, tf);
      } else {
        out = await stockIntraday(symbol, tf);
        if (!out) out = null;
      }
    }
    if (out && out.length) barCache.set(key, out);
    return out;
  }

  /* ---------- 주식 분봉·시간봉 (사전 수집 data/intra/{코드}.json) ---------- */
  async function loadIntra(symbol) {
    if (intraCache.has(symbol)) return intraCache.get(symbol);
    const code = symbol.split(':')[1];
    try {
      const r = await fetch('data/intra/' + encodeURIComponent(code) + '.json?v=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      intraCache.set(symbol, j);
      return j;
    } catch (e) {
      console.warn('[chart] 분봉 데이터 없음', symbol, e);
      intraCache.set(symbol, null);
      return null;
    }
  }

  function resampleBars(list, seconds) {
    if (!list || !list.length) return [];
    const out = [];
    let cur = null, key = null;
    list.forEach((b) => {
      const k = Math.floor(b.time / seconds);
      if (k !== key) {
        cur = { time: k * seconds, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume };
        out.push(cur);
        key = k;
      } else {
        cur.high = Math.max(cur.high, b.high);
        cur.low = Math.min(cur.low, b.low);
        cur.close = b.close;
        cur.volume += b.volume;
      }
    });
    return out;
  }

  async function stockIntraday(symbol, tf) {
    const j = await loadIntra(symbol);
    if (!j) return null;
    const conv = (arr) => (arr || []).map((b) => ({
      time: b[0] + KST_SHIFT, open: b[1], high: b[2], low: b[3], close: b[4], volume: b[5],
    }));
    const sec = { '1': 60, '3': 180, '5': 300, '10': 600, '15': 900, '30': 1800, '60': 3600, '240': 14400 }[tf];
    if (!sec) return null;
    const base = conv(sec <= 180 ? j.m1 : j.m5);
    if (!base.length) return null;
    return sec === 60 ? base : resampleBars(base, sec);
  }

  /* ---------- 지표 계산 ---------- */
  function sma(list, n) {
    const out = [];
    let sum = 0;
    for (let i = 0; i < list.length; i++) {
      sum += list[i].close;
      if (i >= n) sum -= list[i - n].close;
      if (i >= n - 1) out.push({ time: list[i].time, value: sum / n });
    }
    return out;
  }
  function bb(list, n, k) {
    n = n || 20; k = k || 2;
    const mid = sma(list, n);
    const up = [], low = [];
    for (let i = n - 1; i < list.length; i++) {
      let sum = 0;
      for (let j = i - n + 1; j <= i; j++) sum += list[j].close;
      const m = sum / n;
      let v = 0;
      for (let j = i - n + 1; j <= i; j++) v += Math.pow(list[j].close - m, 2);
      const sd = Math.sqrt(v / n);
      up.push({ time: list[i].time, value: m + k * sd });
      low.push({ time: list[i].time, value: m - k * sd });
    }
    return { mid, up, low };
  }
  function rsiData(list, n) {
    n = n || 14;
    const out = [];
    let gain = 0, loss = 0;
    for (let i = 1; i < list.length; i++) {
      const diff = list[i].close - list[i - 1].close;
      const g = Math.max(diff, 0), l = Math.max(-diff, 0);
      if (i <= n) {
        gain += g / n;
        loss += l / n;
        if (i === n) out.push({ time: list[i].time, value: 100 - 100 / (1 + gain / (loss || 1e-9)) });
      } else {
        gain = (gain * (n - 1) + g) / n;
        loss = (loss * (n - 1) + l) / n;
        out.push({ time: list[i].time, value: 100 - 100 / (1 + gain / (loss || 1e-9)) });
      }
    }
    return out;
  }
  function emaList(list, n) {
    const k = 2 / (n + 1);
    let e = null;
    return list.map((d) => {
      e = e === null ? d.value : d.value * k + e * (1 - k);
      return { time: d.time, value: e };
    });
  }
  function macdData(list) {
    const closes = list.map((d) => ({ time: d.time, value: d.close }));
    const e12 = emaList(closes, 12), e26 = emaList(closes, 26);
    const line = [];
    for (let i = 0; i < closes.length; i++) line.push({ time: closes[i].time, value: e12[i].value - e26[i].value });
    const sig = emaList(line, 9);
    const hist = line.map((d, i) => ({ time: d.time, value: d.value - sig[i].value, color: d.value - sig[i].value >= 0 ? palette().hist_up : palette().hist_dn }));
    return { line, sig, hist };
  }

  function emaData(list, n) {
    const k = 2 / (n + 1);
    let e = null;
    return list.map((b) => {
      e = e === null ? b.close : b.close * k + e * (1 - k);
      return { time: b.time, value: e };
    });
  }

  function ichimokuData(list) {
    const step = barStep();
    const mid = (n, i) => {
      let hi = -Infinity, lo = Infinity;
      for (let j = Math.max(0, i - n + 1); j <= i; j++) {
        if (list[j].high > hi) hi = list[j].high;
        if (list[j].low < lo) lo = list[j].low;
      }
      return (hi + lo) / 2;
    };
    const tenkan = [], kijun = [], spanA = [], spanB = [], chikou = [];
    for (let i = 0; i < list.length; i++) {
      if (i >= 8) tenkan.push({ time: list[i].time, value: mid(9, i) });
      if (i >= 25) {
        const t = mid(9, i), k = mid(26, i);
        kijun.push({ time: list[i].time, value: k });
        spanA.push({ time: list[i].time + step * 26, value: (t + k) / 2 });
      }
      if (i >= 51) spanB.push({ time: list[i].time + step * 26, value: mid(52, i) });
      if (i + 26 < list.length) chikou.push({ time: list[i].time, value: list[i + 26].close });
    }
    return { tenkan: tenkan, kijun: kijun, spanA: spanA, spanB: spanB, chikou: chikou };
  }

  function stochData(list, n, kp, dp) {
    n = n || 14; kp = kp || 3; dp = dp || 3;
    const raw = new Array(list.length).fill(null);
    for (let i = n - 1; i < list.length; i++) {
      let hi = -Infinity, lo = Infinity;
      for (let j = i - n + 1; j <= i; j++) {
        if (list[j].high > hi) hi = list[j].high;
        if (list[j].low < lo) lo = list[j].low;
      }
      raw[i] = hi === lo ? 50 : (list[i].close - lo) / (hi - lo) * 100;
    }
    const smooth = (arr, p) => {
      const out = new Array(arr.length).fill(null);
      for (let i = p - 1; i < arr.length; i++) {
        let s = 0, ok = true;
        for (let j = i - p + 1; j <= i; j++) { if (arr[j] == null) { ok = false; break; } s += arr[j]; }
        if (ok) out[i] = s / p;
      }
      return out;
    };
    const kArr = smooth(raw, kp);
    const dArr = smooth(kArr, dp);
    const pack = (arr) => arr.map((v, i) => (v == null ? null : { time: list[i].time, value: v })).filter(Boolean);
    return { k: pack(kArr), d: pack(dArr) };
  }

  function atrData(list, n) {
    n = n || 14;
    const out = [];
    let prev = null;
    for (let i = 1; i < list.length; i++) {
      const tr = Math.max(
        list[i].high - list[i].low,
        Math.abs(list[i].high - list[i - 1].close),
        Math.abs(list[i].low - list[i - 1].close)
      );
      prev = prev === null ? tr : (prev * (n - 1) + tr) / n;
      if (i >= n) out.push({ time: list[i].time, value: prev });
    }
    return out;
  }

  /* ---------- 차트 생성 ---------- */
  function baseOptions(height) {
    const p = palette();
    const host = MP.$('#chartMain');
    return {
      width: host && host.clientWidth ? host.clientWidth : 900,
      height: height || (host && host.clientHeight ? host.clientHeight : 420),
      layout: { background: { type: 'solid', color: p.bg }, textColor: p.text, fontFamily: 'Pretendard, system-ui, sans-serif', fontSize: 11 },
      grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
      rightPriceScale: { borderColor: p.border, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderColor: p.border, timeVisible: true, secondsVisible: false, rightOffset: 6, barSpacing: 8 },
      crosshair: { mode: LWC.CrosshairMode.Normal, vertLine: { color: p.muted, width: 1, style: 3, labelBackgroundColor: p.muted }, horzLine: { color: p.muted, width: 1, style: 3, labelBackgroundColor: p.muted } },
      localization: {
        locale: 'ko-KR',
        priceFormatter: (v) => (v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(v >= 100 ? 1 : 2)),
        timeFormatter: (t) => formatTime(t),
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    };
  }

  function formatTime(t) {
    const d = new Date(t * 1000);
    const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, da = d.getUTCDate();
    const hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    if (['D', 'W', 'M'].indexOf(state.tf) >= 0) return y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
    return String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0') + ' ' + hh + ':' + mm;
  }

  function destroyCharts() {
    if (mainChart) { mainChart.remove(); mainChart = null; }
    if (rsiChart) { rsiChart.remove(); rsiChart = null; }
    if (macdChart) { macdChart.remove(); macdChart = null; }
    if (stochChart) { stochChart.remove(); stochChart = null; }
    if (atrChart) { atrChart.remove(); atrChart = null; }
    candleSeries = volSeries = null;
    Object.keys(maSeries).forEach((k) => delete maSeries[k]);
    Object.keys(bbSeries).forEach((k) => delete bbSeries[k]);
    Object.keys(emaSeries).forEach((k) => delete emaSeries[k]);
    Object.keys(ichiSeries).forEach((k) => delete ichiSeries[k]);
    Object.keys(scenSeries).forEach((k) => delete scenSeries[k]);
  }

  // 모든 차트(메인·보조) 폭·높이를 컨테이너에 맞춰 명시적으로 잡는다
  function layoutCharts() {
    if (!mainChart) return;
    const el = MP.$('#chartMain');
    if (el && el.clientWidth > 0 && el.clientHeight > 0) {
      mainChart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    }
    [[rsiChart, '#rsiChart'], [macdChart, '#macdChart'], [stochChart, '#stochChart'], [atrChart, '#atrChart']]
      .forEach(([c, sel]) => {
        if (!c) return;
        const e = MP.$(sel);
        if (e && e.clientWidth > 0 && e.clientHeight > 0) {
          c.applyOptions({ width: e.clientWidth, height: e.clientHeight });
        }
      });
    drawOverlay();
  }

  function relayoutSoon(ms) {
    [40, 180, 420].forEach((t) => setTimeout(layoutCharts, t + (ms || 0)));
  }

  function buildCharts() {
    const el = MP.$('#mainChart');
    if (!el) return;
    destroyCharts();
    const p = palette();
    mainChart = LWC.createChart(el, baseOptions());
    candleSeries = mainChart.addCandlestickSeries({
      upColor: p.up, downColor: p.down, borderUpColor: p.up, borderDownColor: p.down,
      wickUpColor: p.up, wickDownColor: p.down, priceLineVisible: true, priceLineColor: p.muted,
    });
    volSeries = mainChart.addHistogramSeries({ priceScaleId: 'vol', priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false });
    mainChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      syncSubCharts(range);
      drawOverlay();
    });
    mainChart.subscribeCrosshairMove(() => drawOverlay());
    relayoutSoon(0);
  }

  function syncSubCharts(range) {
    if (!range || syncing) return;
    syncing = true;
    [rsiChart, macdChart, stochChart, atrChart].forEach((c) => { if (c) c.timeScale().setVisibleLogicalRange(range); });
    syncing = false;
  }

  function linkSubChart(c) {
    if (!c || !mainChart) return;
    c.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r && !syncing) {
        syncing = true;
        mainChart.timeScale().setVisibleLogicalRange(r);
        syncing = false;
      }
      drawOverlay();
    });
  }

  /* ---------- 보조지표 시리즈 ---------- */
  function applyIndicators() {
    if (!mainChart) return;
    const p = palette();
    const tf = state.tf;

    // 이동평균
    [[5, 'ma5', p.ma5], [10, 'ma10', '#0EA5E9'], [20, 'ma20', p.ma20], [60, 'ma60', p.ma60], [120, 'ma120', p.ma120]].forEach(([n, key, color]) => {
      if (maSeries[key]) { mainChart.removeSeries(maSeries[key]); delete maSeries[key]; }
      if (state.inds[key]) {
        const s = mainChart.addLineSeries({ color: color, lineWidth: 1.2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(sma(bars, n));
        maSeries[key] = s;
      }
    });

    // 볼린저
    ['bbUp', 'bbMid', 'bbLow'].forEach((k) => { if (bbSeries[k]) { mainChart.removeSeries(bbSeries[k]); delete bbSeries[k]; } });
    if (state.inds.bb) {
      const b = bb(bars, 20, 2);
      const mk = (data, dash) => {
        const s = mainChart.addLineSeries({ color: p.bb, lineWidth: 1, lineStyle: dash ? 2 : 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(data);
        return s;
      };
      bbSeries.bbUp = mk(b.up, true);
      bbSeries.bbMid = mk(b.mid, false);
      bbSeries.bbLow = mk(b.low, true);
    }

    // EMA 12/26
    [['ema12', 12, p.ma5], ['ema26', 26, p.ma20]].forEach(([key, n, color]) => {
      if (emaSeries[key]) { mainChart.removeSeries(emaSeries[key]); delete emaSeries[key]; }
      if (state.inds.ema) {
        const es = mainChart.addLineSeries({ color: color, lineWidth: 1.1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        es.setData(emaData(bars, n));
        emaSeries[key] = es;
      }
    });

    // 일목균형표
    ['tenkan', 'kijun', 'spanA', 'spanB', 'chikou'].forEach((k) => {
      if (ichiSeries[k]) { mainChart.removeSeries(ichiSeries[k]); delete ichiSeries[k]; }
    });
    if (state.inds.ichi) {
      const ic = ichimokuData(bars);
      const mkLine = (data, color, width, dash) => {
        const ser = mainChart.addLineSeries({ color: color, lineWidth: width || 1, lineStyle: dash ? 2 : 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        ser.setData(data);
        return ser;
      };
      ichiSeries.tenkan = mkLine(ic.tenkan, '#E11D48', 1.2);
      ichiSeries.kijun = mkLine(ic.kijun, '#2563EB', 1.2);
      ichiSeries.spanA = mkLine(ic.spanA, 'rgba(16,185,129,.75)', 1, true);
      ichiSeries.spanB = mkLine(ic.spanB, 'rgba(245,158,11,.75)', 1, true);
      ichiSeries.chikou = mkLine(ic.chikou, '#8B5CF6', 1, true);
    }

    // 거래량
    if (volSeries) {
      volSeries.setData(state.inds.vol ? bars.map((b) => ({
        time: b.time, value: b.volume, color: b.close >= b.open ? p.hist_up : p.hist_dn,
      })) : []);
      mainChart.priceScale('vol').applyOptions({ scaleMargins: { top: state.inds.vol ? 0.82 : 1.1, bottom: 0 } });
    }

    // RSI
    const rsiWrap = MP.$('#rsiWrap');
    if (state.inds.rsi) {
      if (!rsiChart) {
        rsiChart = LWC.createChart(MP.$('#rsiChart'), Object.assign(baseOptions(), {
          rightPriceScale: { borderColor: p.border, scaleMargins: { top: 0.15, bottom: 0.15 } },
        }));
        rsiSeries = rsiChart.addLineSeries({ color: p.rsi, lineWidth: 1.4, priceLineVisible: false, lastValueVisible: true });
        rsiSeries.createPriceLine({ price: 70, color: p.down, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '70' });
        rsiSeries.createPriceLine({ price: 30, color: p.up, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '30' });
        rsiChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
          if (r && !syncing && mainChart) { syncing = true; mainChart.timeScale().setVisibleLogicalRange(r); syncing = false; }
        });
      }
      if (rsiWrap) rsiWrap.hidden = false;
      rsiSeries.setData(rsiData(bars, 14));
    } else if (rsiWrap) {
      rsiWrap.hidden = true;
    }

    // MACD
    const macdWrap = MP.$('#macdWrap');
    if (state.inds.macd) {
      if (!macdChart) {
        macdChart = LWC.createChart(MP.$('#macdChart'), Object.assign(baseOptions(), {
          rightPriceScale: { borderColor: p.border, scaleMargins: { top: 0.2, bottom: 0.2 } },
        }));
        macdHist = macdChart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false });
        macdLine = macdChart.addLineSeries({ color: p.macd, lineWidth: 1.3, priceLineVisible: false, lastValueVisible: false });
        macdSig = macdChart.addLineSeries({ color: p.signal, lineWidth: 1.2, priceLineVisible: false, lastValueVisible: false });
        macdChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
          if (r && !syncing && mainChart) { syncing = true; mainChart.timeScale().setVisibleLogicalRange(r); syncing = false; }
        });
      }
      if (macdWrap) macdWrap.hidden = false;
      const m = macdData(bars);
      macdHist.setData(m.hist);
      macdLine.setData(m.line);
      macdSig.setData(m.sig);
    } else if (macdWrap) {
      macdWrap.hidden = true;
    }

    // 스토캐스틱
    const stochWrap = MP.$('#stochWrap');
    if (state.inds.stoch) {
      if (!stochChart) {
        stochChart = LWC.createChart(MP.$('#stochChart'), Object.assign(baseOptions(), {
          rightPriceScale: { borderColor: p.border, scaleMargins: { top: 0.15, bottom: 0.15 } },
        }));
        stochK = stochChart.addLineSeries({ color: p.macd, lineWidth: 1.3, priceLineVisible: false, lastValueVisible: false });
        stochD = stochChart.addLineSeries({ color: p.signal, lineWidth: 1.2, priceLineVisible: false, lastValueVisible: false });
        stochK.createPriceLine({ price: 80, color: p.down, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '80' });
        stochK.createPriceLine({ price: 20, color: p.up, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: '20' });
        linkSubChart(stochChart);
      }
      if (stochWrap) stochWrap.hidden = false;
      const sd = stochData(bars, 14, 3, 3);
      stochK.setData(sd.k);
      stochD.setData(sd.d);
    } else if (stochWrap) {
      stochWrap.hidden = true;
    }

    // ATR
    const atrWrap = MP.$('#atrWrap');
    if (state.inds.atr) {
      if (!atrChart) {
        atrChart = LWC.createChart(MP.$('#atrChart'), Object.assign(baseOptions(), {
          rightPriceScale: { borderColor: p.border, scaleMargins: { top: 0.2, bottom: 0.2 } },
        }));
        atrSeries = atrChart.addLineSeries({ color: p.rsi, lineWidth: 1.3, priceLineVisible: false, lastValueVisible: true });
        linkSubChart(atrChart);
      }
      if (atrWrap) atrWrap.hidden = false;
      atrSeries.setData(atrData(bars, 14));
    } else if (atrWrap) {
      atrWrap.hidden = true;
    }

    if (mainChart) {
      const r = mainChart.timeScale().getVisibleLogicalRange();
      if (r) {
        syncing = true;
        [rsiChart, macdChart, stochChart, atrChart].forEach((c) => { if (c) c.timeScale().setVisibleLogicalRange(r); });
        syncing = false;
      }
    }
    drawOverlay();
    relayoutSoon(0);
  }

  /* ---------- 그리기 오버레이 ---------- */
  function setupCanvas() {
    drawLayer = MP.$('#drawLayer');
    chartMain = MP.$('#chartMain');
    if (!drawLayer) return;
    drawCtx = drawLayer.getContext('2d');
    const resize = () => {
      const r = chartMain.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      drawLayer.width = Math.round(r.width * dpr);
      drawLayer.height = Math.round(r.height * dpr);
      drawLayer.style.width = r.width + 'px';
      drawLayer.style.height = r.height + 'px';
      drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutCharts();
      drawOverlay();
    };
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(chartMain);
    resize();
    bindDrawing();
  }

  function xOf(time) {
    if (!mainChart || time == null) return null;
    const x = mainChart.timeScale().timeToCoordinate(time);
    return x == null ? null : x;
  }
  function yOf(price) {
    if (!candleSeries || price == null) return null;
    return candleSeries.priceToCoordinate(price);
  }
  function priceAt(y) {
    if (!candleSeries) return null;
    return candleSeries.coordinateToPrice(y);
  }
  function timeAt(x) {
    if (!mainChart) return null;
    return mainChart.timeScale().coordinateToTime(x);
  }

  function drawOverlay() {
    if (!drawCtx || !drawLayer) return;
    const p = palette();
    const w = drawLayer.width / (window.devicePixelRatio || 1);
    const h = drawLayer.height / (window.devicePixelRatio || 1);
    drawCtx.clearRect(0, 0, w, h);

    const all = drawings.concat(channelDraft ? [channelDraft] : []).concat(pending ? [pending] : []);
    all.forEach((d, idx) => {
      drawCtx.strokeStyle = p.text;
      drawCtx.fillStyle = p.text;
      drawCtx.lineWidth = 1.3;
      drawCtx.font = '11px Pretendard, system-ui, sans-serif';

      if (d.type === 'hline') {
        const y = yOf(d.p1);
        if (y == null) return;
        drawCtx.beginPath();
        drawCtx.setLineDash([5, 4]);
        drawCtx.moveTo(0, y);
        drawCtx.lineTo(w, y);
        drawCtx.stroke();
        drawCtx.setLineDash([]);
        drawCtx.fillStyle = p.bg;
        const label = fmtNum(d.p1);
        const tw = drawCtx.measureText(label).width + 10;
        drawCtx.fillRect(w - tw - 4, y - 9, tw, 18);
        drawCtx.strokeRect(w - tw - 4, y - 9, tw, 18);
        drawCtx.fillStyle = p.text;
        drawCtx.fillText(label, w - tw + 1, y + 4);
      } else if (d.type === 'vline') {
        const x = xOf(d.t1);
        if (x == null) return;
        drawCtx.beginPath();
        drawCtx.setLineDash([5, 4]);
        drawCtx.moveTo(x, 0);
        drawCtx.lineTo(x, h);
        drawCtx.stroke();
        drawCtx.setLineDash([]);
      } else if (d.type === 'trend') {
        const x1 = xOf(d.t1), y1 = yOf(d.p1), x2 = xOf(d.t2), y2 = yOf(d.p2);
        if ([x1, y1, x2, y2].some((v) => v == null)) return;
        drawCtx.beginPath();
        drawCtx.moveTo(x1, y1);
        drawCtx.lineTo(x2, y2);
        drawCtx.stroke();
        dot(x1, y1); dot(x2, y2);
      } else if (d.type === 'rect') {
        const x1 = xOf(d.t1), y1 = yOf(d.p1), x2 = xOf(d.t2), y2 = yOf(d.p2);
        if ([x1, y1, x2, y2].some((v) => v == null)) return;
        drawCtx.globalAlpha = 0.12;
        drawCtx.fillStyle = p.bb;
        drawCtx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        drawCtx.globalAlpha = 1;
        drawCtx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (d.type === 'fib') {
        const x1 = xOf(d.t1), x2 = xOf(d.t2);
        if (x1 == null || x2 == null) return;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const lo = Math.min(d.p1, d.p2), hi = Math.max(d.p1, d.p2);
        drawCtx.beginPath();
        drawCtx.setLineDash([4, 3]);
        drawCtx.moveTo(Math.min(x1, x2), 0);
        drawCtx.lineTo(Math.min(x1, x2), h);
        drawCtx.moveTo(Math.max(x1, x2), 0);
        drawCtx.lineTo(Math.max(x1, x2), h);
        drawCtx.stroke();
        drawCtx.setLineDash([]);
        levels.forEach((lv) => {
          const price = hi - (hi - lo) * lv;
          const y = yOf(price);
          if (y == null) return;
          drawCtx.strokeStyle = p.bb;
          drawCtx.beginPath();
          drawCtx.moveTo(Math.min(x1, x2), y);
          drawCtx.lineTo(Math.max(x1, x2), y);
          drawCtx.stroke();
          drawCtx.fillStyle = p.text;
          drawCtx.fillText((lv * 100).toFixed(1) + '%  ' + fmtNum(price), Math.min(x1, x2) + 4, y - 3);
        });
      } else if (d.type === 'text') {
        const x = xOf(d.t1), y = yOf(d.p1);
        if (x == null || y == null) return;
        drawCtx.fillStyle = p.bg;
        const tw = drawCtx.measureText(d.text || '').width + 10;
        drawCtx.fillRect(x - 2, y - 16, tw, 18);
        drawCtx.strokeStyle = p.border;
        drawCtx.strokeRect(x - 2, y - 16, tw, 18);
        drawCtx.fillStyle = p.text;
        drawCtx.fillText(d.text || '', x + 3, y - 3);
      } else if (d.type === 'channel') {
        const x1 = xOf(d.t1), y1 = yOf(d.p1), x2 = xOf(d.t2), y2 = yOf(d.p2);
        if ([x1, y1, x2, y2].some((v) => v == null)) return;
        const off = d.off || 0;
        const oy = off ? yOf(priceAt(y1) + off) - y1 : 0;
        drawCtx.strokeStyle = p.accent || p.bb;
        drawCtx.lineWidth = 1.4;
        drawCtx.beginPath(); drawCtx.moveTo(x1, y1); drawCtx.lineTo(x2, y2); drawCtx.stroke();
        drawCtx.setLineDash([5, 4]);
        drawCtx.beginPath(); drawCtx.moveTo(x1, y1 + oy); drawCtx.lineTo(x2, y2 + oy); drawCtx.stroke();
        drawCtx.setLineDash([]);
        drawCtx.globalAlpha = 0.10;
        drawCtx.fillStyle = p.bb;
        drawCtx.beginPath();
        drawCtx.moveTo(x1, y1); drawCtx.lineTo(x2, y2); drawCtx.lineTo(x2, y2 + oy); drawCtx.lineTo(x1, y1 + oy);
        drawCtx.closePath(); drawCtx.fill();
        drawCtx.globalAlpha = 1;
        dot(x1, y1); dot(x2, y2);
      } else if (d.type === 'arrow') {
        const x1 = xOf(d.t1), y1 = yOf(d.p1), x2 = xOf(d.t2), y2 = yOf(d.p2);
        if ([x1, y1, x2, y2].some((v) => v == null)) return;
        const ang = Math.atan2(y2 - y1, x2 - x1);
        drawCtx.strokeStyle = p.accent || p.text;
        drawCtx.lineWidth = 1.8;
        drawCtx.beginPath(); drawCtx.moveTo(x1, y1); drawCtx.lineTo(x2, y2); drawCtx.stroke();
        const head = 9;
        drawCtx.beginPath();
        drawCtx.moveTo(x2, y2);
        drawCtx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
        drawCtx.moveTo(x2, y2);
        drawCtx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
        drawCtx.stroke();
        dot(x1, y1);
      } else if (d.type === 'ruler') {
        const x1 = xOf(d.t1), y1 = yOf(d.p1), x2 = xOf(d.t2), y2 = yOf(d.p2);
        if ([x1, y1, x2, y2].some((v) => v == null)) return;
        const up = d.p2 >= d.p1;
        drawCtx.strokeStyle = up ? p.up : p.down;
        drawCtx.fillStyle = up ? p.up : p.down;
        drawCtx.lineWidth = 1.4;
        drawCtx.setLineDash([4, 3]);
        drawCtx.beginPath(); drawCtx.moveTo(x1, y1); drawCtx.lineTo(x2, y2); drawCtx.stroke();
        drawCtx.setLineDash([]);
        drawCtx.globalAlpha = 0.12;
        drawCtx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        drawCtx.globalAlpha = 1;
        dot(x1, y1); dot(x2, y2);
        const dp = d.p2 - d.p1;
        const pct = d.p1 ? (dp / d.p1) * 100 : 0;
        const nb = Math.abs(d.t2 - d.t1) / (barStep() || 1);
        const label = (dp >= 0 ? '+' : '') + fmtNum(dp) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%) · ' + Math.max(1, Math.round(nb)) + '봉';
        drawCtx.font = '700 10.5px Pretendard, system-ui, sans-serif';
        const tw = drawCtx.measureText(label).width;
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        drawCtx.fillStyle = up ? p.up : p.down;
        drawCtx.globalAlpha = 0.92;
        drawCtx.fillRect(cx - tw / 2 - 6, cy - 20, tw + 12, 17);
        drawCtx.globalAlpha = 1;
        drawCtx.fillStyle = '#fff';
        drawCtx.fillText(label, cx - tw / 2, cy - 7.5);
      }
    });

    function dot(x, y) {
      drawCtx.beginPath();
      drawCtx.arc(x, y, 3, 0, Math.PI * 2);
      drawCtx.fillStyle = p.text;
      drawCtx.fill();
    }

    drawScenarioLabels(w, h, p);
  }

  function fmtNum(v) {
    if (!Number.isFinite(v)) return '';
    return v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(2);
  }

  function bindDrawing() {
    const setTool = (t) => {
      if (channelDraft && t !== 'channel') { channelDraft = null; }
      state.tool = t;
      MP.$$('.tool').forEach((b) => b.classList.toggle('is-active', b.dataset.tool === t));
      drawLayer.style.pointerEvents = t === 'cross' ? 'none' : 'auto';
      drawLayer.style.cursor = t === 'cross' ? 'default' : 'crosshair';
      MP.toast(t === 'cross' ? '이동·확대 모드' : '차트를 클릭해 그리세요 (이동하려면 십자선 선택)');
    };
    MP.$$('.tool[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
    drawLayer.style.pointerEvents = 'none';

    const pos = (ev) => {
      const r = drawLayer.getBoundingClientRect();
      const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
      return { x: x, y: y, t: timeAt(x), p: priceAt(y) };
    };

    let dragging = false;
    const start = (ev) => {
      if (state.tool === 'cross') return;
      const q = pos(ev);
      if (q.t == null || q.p == null) return;
      ev.preventDefault();
      if (state.tool === 'channel' && channelDraft) {
        drawings.push(channelDraft);
        channelDraft = null;
        drawOverlay();
        MP.toast('평행채널을 저장했습니다');
        return;
      }
      if (state.tool === 'hline') { drawings.push({ type: 'hline', p1: q.p }); drawOverlay(); return; }
      if (state.tool === 'vline') { drawings.push({ type: 'vline', t1: q.t }); drawOverlay(); return; }
      if (state.tool === 'text') {
        const txt = window.prompt('메모 내용을 입력하세요', '');
        if (txt) drawings.push({ type: 'text', t1: q.t, p1: q.p, text: txt });
        drawOverlay();
        return;
      }
      dragging = true;
      pending = { type: state.tool, t1: q.t, p1: q.p, t2: q.t, p2: q.p };
      drawOverlay();
    };
    const move = (ev) => {
      if (channelDraft) {
        const q = pos(ev);
        if (q.t != null && q.p != null) {
          const span = (channelDraft.t2 - channelDraft.t1) || 1;
          const f = (q.t - channelDraft.t1) / span;
          const baseP = channelDraft.p1 + (channelDraft.p2 - channelDraft.p1) * f;
          channelDraft.off = q.p - baseP;
          drawOverlay();
        }
        return;
      }
      if (!dragging || !pending) return;
      const q = pos(ev);
      pending.t2 = q.t; pending.p2 = q.p;
      drawOverlay();
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (pending && pending.t2 != null && pending.p2 != null &&
          (pending.t1 !== pending.t2 || pending.p1 !== pending.p2)) {
        if (pending.type === 'channel') {
          channelDraft = pending;
          MP.toast('한 번 더 클릭해 채널 폭을 정하세요');
        } else {
          drawings.push(pending);
        }
      }
      pending = null;
      drawOverlay();
    };
    drawLayer.addEventListener('mousedown', start);
    drawLayer.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    drawLayer.addEventListener('touchstart', start, { passive: false });
    drawLayer.addEventListener('touchmove', move, { passive: false });
    drawLayer.addEventListener('touchend', end);

    const undo = MP.$('#undoBtn');
    if (undo) undo.addEventListener('click', () => { drawings.pop(); drawOverlay(); MP.toast('마지막 그리기를 되돌렸습니다'); });
    const clr = MP.$('#clearDraw');
    if (clr) clr.addEventListener('click', () => { drawings = []; drawOverlay(); MP.toast('그리기를 모두 지웠습니다'); });
  }

  /* ---------- 헤더 ---------- */
  function nameOf(symbol) {
    const hit = MP.catalog.find((c) => c.symbol === symbol);
    return hit ? hit.name : symbol;
  }
  function marketLabel(symbol) {
    if (/^UPBIT:/.test(symbol)) return '코인 · 업비트';
    if (/^KRX:KOSPI|^KRX:KOSDAQ/.test(symbol)) return '국내 지수';
    if (/^KRX:/.test(symbol)) return '국내주식 · 지연';
    return '미국주식 · 지연';
  }

  function livePrice(symbol) {
    const m = symbol.match(/^UPBIT:([A-Z]+)KRW$/);
    if (m && MP.coinQuotes) {
      const q = MP.coinQuotes.get('KRW-' + m[1]);
      if (q) return { price: q.price, ratio: q.change * 100, currency: 'KRW' };
    }
    const q = MP.quoteOf ? MP.quoteOf(symbol) : null;
    if (q) return { price: q.price, ratio: q.ratio, currency: /^UPBIT:|^KRX:/.test(symbol) ? 'KRW' : 'USD' };
    return null;
  }

  function renderHead() {
    const symbol = state.symbol;
    const set = (sel, txt) => { const el = MP.$(sel); if (el) el.textContent = txt; };
    set('#shName', nameOf(symbol));
    set('#shCode', symbol);
    set('#shMarket', marketLabel(symbol));
    const tagEl = MP.$('#shThemes');
    if (tagEl) {
      const hit = (MP.catalog || []).find((c) => c.symbol === symbol);
      const tags = (hit && hit.themes) || [];
      tagEl.innerHTML = tags.map((t) =>
        '<button type="button" class="theme-tag" data-theme="' + MP.escape(t) + '">#' + MP.escape(t) + '</button>').join('');
    }
    const live = livePrice(symbol);
    const priceEl = MP.$('#shPrice'), chgEl = MP.$('#shChg');
    if (priceEl && chgEl) {
      if (live && Number.isFinite(live.price)) {
        const usd = live.currency === 'USD';
        priceEl.textContent = (usd ? '$' : '') + (live.price >= 1000 ? Math.round(live.price).toLocaleString('ko-KR') : live.price.toFixed(2)) + (usd ? '' : '원');
        const dir = MP.dir(live.ratio);
        chgEl.className = 'chg ' + dir;
        chgEl.textContent = (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–') + ' ' + Math.abs(live.ratio || 0).toFixed(2) + '%';
      } else {
        priceEl.textContent = '—';
        chgEl.textContent = '';
      }
    }
  }

  /* ---------- 링크 패널 ---------- */
  function buildLinks(symbol) {
    const name = nameOf(symbol);
    const out = [];
    const kr = symbol.match(/^KRX:(\d{6})$/);
    const up = symbol.match(/^UPBIT:([A-Z]+)KRW$/);
    if (kr) {
      const code = kr[1];
      out.push({ label: 'DART 공시', desc: '전자공시', url: 'https://dart.fss.or.kr/dsab007/main.do?option=corp&textCrpNm=' + encodeURIComponent(name) });
      out.push({ label: '종목토론실', desc: '네이버 금융', url: 'https://finance.naver.com/item/board.naver?code=' + code });
      out.push({ label: '증권사 리서치', desc: '목표주가', url: 'https://finance.naver.com/research/company_list.naver?searchType=itemCode&itemCode=' + code });
      out.push({ label: '종목 뉴스', desc: '네이버 금융', url: 'https://finance.naver.com/item/news.naver?code=' + code });
    } else if (up) {
      out.push({ label: '업비트 거래', desc: up[1] + '/원화', url: 'https://upbit.com/exchange?code=CRIX.UPBIT.KRW-' + up[1] });
      out.push({ label: '코인 뉴스', desc: '코인데스크코리아', url: 'https://www.coindeskkorea.com/?s=' + encodeURIComponent(name) });
    } else {
      const tick = symbol.split(':')[1] || symbol;
      out.push({ label: '야후 파이낸스', desc: '재무·실적', url: 'https://finance.yahoo.com/quote/' + encodeURIComponent(tick) });
      out.push({ label: '한글 뉴스 검색', desc: '구글 뉴스', url: 'https://news.google.com/search?q=' + encodeURIComponent(name) + '&hl=ko&gl=KR&ceid=KR:ko' });
    }
    out.push({ label: '트레이딩뷰', desc: '전체화면 차트', url: 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(symbol) });
    return out;
  }
  function renderLinks() {
    const box = MP.$('#linkList');
    if (!box) return;
    box.innerHTML = buildLinks(state.symbol).map((l) =>
      '<a class="link-item" href="' + MP.escape(l.url) + '" target="_blank" rel="noopener nofollow">' +
      '<span class="link-label">' + MP.escape(l.label) + '</span>' +
      '<span class="link-desc">' + MP.escape(l.desc) + '</span>' +
      '<span class="link-go">↗</span></a>').join('');
  }

  /* ---------- 메모 ---------- */
  function renderMemo() {
    const box = MP.$('#memoBox');
    if (!box) return;
    const arr = MP.store.get('mp.watch', []);
    const it = (arr || []).find((x) => x.symbol === state.symbol);
    box.value = it ? it.note || '' : '';
  }

  /* ---------- 그리기 ---------- */
  function setTF(tf) {
    state.tf = tf;
    MP.$$('.tf').forEach((b) => b.classList.toggle('is-active', b.dataset.tf === tf));
    loadChart();
  }

  async function loadChart() {
    const mask = MP.$('#loadMask');
    if (mask) mask.hidden = false;
    try {
      const data = await getBars(state.symbol, state.tf);
      if (!data || !data.length) {
        if (mask) { mask.innerHTML = '<span></span>' + (isStock() && ['D', 'W', 'M'].indexOf(state.tf) < 0
          ? '이 종목의 분봉 데이터가 아직 없습니다'
          : '이 종목의 시계열 데이터가 없습니다'); }
        bars = [];
        if (candleSeries) candleSeries.setData([]);
        if (volSeries) volSeries.setData([]);
        renderAnalytics();
        return;
      }
      bars = data;
      candleSeries.setData(bars.map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close })));
      applyIndicators();
      renderAnalytics();
      mainChart.timeScale().fitContent();
      if (mask) mask.hidden = true;
      const note = MP.$('#chartNote');
      if (note) {
        note.textContent = isCoin()
          ? '업비트 캔들 실시간 · 휠 확대/축소 · 드래그 이동 · 좌측 도구로 그리기'
          : '지연 시세(약 15~20분) · 분봉(1·3·5·15·30분·1·4시간)·일/주/월봉 · 5년 일봉 데이터';
      }
    } catch (e) {
      console.warn('[chart] 로드 실패', e);
      if (mask) { mask.hidden = false; mask.innerHTML = '<span></span>데이터를 불러오지 못했습니다'; }
    }
  }

  function selectSymbol(symbol, name) {
    if (!symbol) return;
    const clean = String(symbol).trim().toUpperCase();
    const changed = clean !== state.symbol;
    state.symbol = clean;
    state.market = /^KRX:/.test(clean) ? 'kr' : /^UPBIT:/.test(clean) ? 'crypto' : 'us';
    if (isStock(clean) && ['D', 'W', 'M'].indexOf(state.tf) < 0) state.tf = 'D';
    if (!isCoin(clean) && state.tf === '240') state.tf = 'D';
    // 주식 분봉 버튼 상태
    MP.$$('.tf').forEach((b) => {
      const tf = b.dataset.tf;
      const off = false; // 모든 종목 분봉·일/주/월봉 지원
      b.classList.toggle('is-disabled', off);
      b.classList.toggle('is-active', tf === state.tf);
    });
    if (changed) {
      drawings = [];
      pending = null;
    }
    renderHead();
    renderLinks();
    renderMemo();
    loadChart();
    MP.emit('symbol-changed', clean);
    MP.emit('symbol', clean);
  }

  /* ---------- 통합 검색 ---------- */
  function initSearch() {
    const form = MP.$('#symbolForm');
    const input = MP.$('#symbolInput');
    const list = MP.$('#suggestList');
    if (!form || !input || !list) return;
    let items = [], cursor = -1;
    const close = () => { list.hidden = true; cursor = -1; };
    const paint = () => {
      if (!items.length) { list.hidden = true; return; }
      list.innerHTML = items.map((it, i) =>
        '<li data-i="' + i + '" class="' + (i === cursor ? 'is-cur' : '') + '">' +
        '<span>' + MP.escape(it.name) + '</span><span class="s-code">' + MP.escape(it.symbol) + '</span></li>').join('');
      list.hidden = false;
    };
    input.addEventListener('input', () => { items = MP.searchSymbols(input.value, 8); cursor = -1; paint(); });
    input.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, items.length - 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, -1); paint(); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('mousedown', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const it = items[+li.dataset.i];
      if (it) { selectSymbol(it.symbol); close(); input.blur(); input.value = it.name; }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      const pick = cursor >= 0 && items[cursor] ? items[cursor] : (MP.searchSymbols(v, 1)[0] || { symbol: v.toUpperCase(), name: v });
      selectSymbol(pick.symbol, pick.name);
      close();
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search')) close(); });
  }

  /* ============================================================
     매매전략 시그널 엔진 + AI 종목 판단
     ============================================================ */
  function numFmt(v) {
    if (!Number.isFinite(v)) return '—';
    return v >= 1000 ? Math.round(v).toLocaleString('ko-KR') : v.toFixed(2);
  }

  // MACD처럼 값이 큰 지표를 읽기 쉽게 압축 (억/만 단위)
  function compactNum(v) {
    if (!Number.isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e8) return (v / 1e8).toFixed(2) + '억';
    if (a >= 1e4) return (v / 1e4).toFixed(1) + '만';
    if (a >= 100) return Math.round(v).toLocaleString('ko-KR');
    return v.toFixed(2);
  }

  function maAt(list, n) {
    const out = new Array(list.length).fill(null);
    let sum = 0;
    for (let i = 0; i < list.length; i++) {
      sum += list[i].close;
      if (i >= n) sum -= list[i - n].close;
      if (i >= n - 1) out[i] = sum / n;
    }
    return out;
  }

  function rsiAt(list, n) {
    n = n || 14;
    const out = new Array(list.length).fill(null);
    let gain = 0, loss = 0;
    for (let i = 1; i < list.length; i++) {
      const diff = list[i].close - list[i - 1].close;
      const g = Math.max(diff, 0), l = Math.max(-diff, 0);
      if (i <= n) {
        gain += g / n; loss += l / n;
        if (i === n) out[i] = 100 - 100 / (1 + gain / (loss || 1e-9));
      } else {
        gain = (gain * (n - 1) + g) / n;
        loss = (loss * (n - 1) + l) / n;
        out[i] = 100 - 100 / (1 + gain / (loss || 1e-9));
      }
    }
    return out;
  }

  function bbAt(list, n, k) {
    n = n || 20; k = k || 2;
    const mid = maAt(list, n);
    const up = new Array(list.length).fill(null);
    const low = new Array(list.length).fill(null);
    const pctB = new Array(list.length).fill(null);
    for (let i = n - 1; i < list.length; i++) {
      let v = 0;
      for (let j = i - n + 1; j <= i; j++) v += Math.pow(list[j].close - mid[i], 2);
      const sd = Math.sqrt(v / n);
      up[i] = mid[i] + k * sd;
      low[i] = mid[i] - k * sd;
      pctB[i] = sd ? (list[i].close - low[i]) / (2 * sd) : 0.5;
    }
    return { mid: mid, up: up, low: low, pctB: pctB };
  }

  function macdAt(list) {
    const closes = list.map((b) => b.close);
    const ema = (arr, n) => {
      const k = 2 / (n + 1);
      let e = null;
      return arr.map((v) => { e = e === null ? v : v * k + e * (1 - k); return e; });
    };
    const e12 = ema(closes, 12), e26 = ema(closes, 26);
    const line = closes.map((c, i) => e12[i] - e26[i]);
    const sig = ema(line, 9);
    return { line: line, sig: sig, hist: line.map((v, i) => v - sig[i]) };
  }

  function indicatorsOf(list) {
    return {
      ma5: maAt(list, 5), ma20: maAt(list, 20), ma60: maAt(list, 60), ma120: maAt(list, 120),
      rsi: rsiAt(list, 14), bb: bbAt(list, 20, 2), macd: macdAt(list),
    };
  }

  const STRATEGY = {
    ma: { name: '이평선 골든/데드크로스', desc: 'MA5가 MA20을 상향 돌파하면 매수, 하향 돌파하면 매도 (추세추종)' },
    rsi: { name: 'RSI 과매도/과매수', desc: 'RSI(14)가 30을 회복하면 매수, 70을 이탈하면 매도 (역추세)' },
    bb: { name: '볼린저 하단 반등·상단 복귀', desc: '종가가 볼린저 하단을 되돌리면 매수, 상단을 되돌리면 매도 (평균회귀)' },
    pull: { name: '정배열 눌림목 스윙', desc: 'MA5>MA20>MA60 정배열에서 MA20 눌림 매수, MA60 이탈 시 매도 (스윙)' },
  };
  let strategy = 'ma';

  function rawSignals(kind, list, ind) {
    const out = [];
    const ma5 = ind.ma5, ma20 = ind.ma20, ma60 = ind.ma60;
    const rsi = ind.rsi, bbu = ind.bb.up, bbl = ind.bb.low;
    for (let i = 1; i < list.length; i++) {
      const c = list[i], p = list[i - 1];
      if (kind === 'ma') {
        if (ma5[i] == null || ma20[i] == null || ma5[i - 1] == null || ma20[i - 1] == null) continue;
        if (ma5[i - 1] <= ma20[i - 1] && ma5[i] > ma20[i]) out.push({ i: i, type: 'buy' });
        else if (ma5[i - 1] >= ma20[i - 1] && ma5[i] < ma20[i]) out.push({ i: i, type: 'sell' });
      } else if (kind === 'rsi') {
        if (rsi[i] == null || rsi[i - 1] == null) continue;
        if (rsi[i - 1] < 30 && rsi[i] >= 30) out.push({ i: i, type: 'buy' });
        else if (rsi[i - 1] > 70 && rsi[i] <= 70) out.push({ i: i, type: 'sell' });
      } else if (kind === 'bb') {
        if (bbl[i] == null || bbl[i - 1] == null || bbu[i] == null || bbu[i - 1] == null) continue;
        if (p.close <= bbl[i - 1] && c.close > bbl[i]) out.push({ i: i, type: 'buy' });
        else if (p.close >= bbu[i - 1] && c.close < bbu[i]) out.push({ i: i, type: 'sell' });
      } else if (kind === 'pull') {
        if (ma5[i] == null || ma20[i] == null || ma60[i] == null) continue;
        const align = ma5[i] > ma20[i] && ma20[i] > ma60[i];
        const near = c.low <= ma20[i] * 1.005 && c.close >= ma20[i];
        if (align && near) out.push({ i: i, type: 'buy' });
        else if (c.close < ma60[i]) out.push({ i: i, type: 'sell' });
      }
    }
    return out;
  }

  // 매수 → 매도 순서가 번갈아 나오도록 정리 (중복 진입/청산 신호 제거)
  function dedupeSignals(raw) {
    const out = [];
    let holding = false;
    raw.forEach((s) => {
      if (s.type === 'buy' && !holding) { out.push(s); holding = true; }
      else if (s.type === 'sell' && holding) { out.push(s); holding = false; }
    });
    return out;
  }

  function runBacktest(list, sig) {
    const trades = [];
    let entry = null;
    sig.forEach((s) => {
      const px = list[s.i].close;
      if (s.type === 'buy' && !entry) entry = { i: s.i, price: px };
      else if (s.type === 'sell' && entry) {
        const ret = entry.price ? (px / entry.price - 1) * 100 : 0;
        trades.push({ in: entry.price, out: px, ret: ret, bars: s.i - entry.i });
        entry = null;
      }
    });
    const wins = trades.filter((t) => t.ret > 0).length;
    let cum = 1, peak = 1, mdd = 0;
    trades.forEach((t) => {
      cum *= 1 + t.ret / 100;
      if (cum > peak) peak = cum;
      const dd = cum / peak - 1;
      if (dd < mdd) mdd = dd;
    });
    const avg = trades.length ? trades.reduce((a, t) => a + t.ret, 0) / trades.length : null;
    return {
      count: sig.length, n: trades.length,
      trades: trades,
      winRate: trades.length ? (wins / trades.length) * 100 : null,
      cum: trades.length ? (cum - 1) * 100 : null,
      avg: avg,
      mdd: trades.length ? mdd * 100 : null,
      open: entry,
    };
  }

  function paintMarkers(sig) {
    if (!candleSeries) return;
    if (!sig || !sig.length) { candleSeries.setMarkers([]); return; }
    const p = palette();
    const marks = sig.slice(-36).map((s) => ({
      time: bars[s.i].time,
      position: s.type === 'buy' ? 'belowBar' : 'aboveBar',
      color: s.type === 'buy' ? p.up : p.down,
      shape: s.type === 'buy' ? 'arrowUp' : 'arrowDown',
      text: s.type === 'buy' ? '매수' : '매도',
      size: 1,
    }));
    candleSeries.setMarkers(marks);
  }

  function renderStrategy() {
    const metrics = MP.$('#stratMetrics');
    const sigEl = MP.$('#stratSignal');
    const guide = MP.$('#stratGuide');
    if (!metrics || !guide) return;
    const meta = STRATEGY[strategy] || STRATEGY.ma;

    if (!bars || bars.length < 40) {
      if (candleSeries) candleSeries.setMarkers([]);
      metrics.innerHTML =
        '<div class="m"><span>승률</span><b>—</b></div>' +
        '<div class="m"><span>누적 수익률</span><b>—</b></div>' +
        '<div class="m"><span>거래/신호</span><b>—</b></div>' +
        '<div class="m"><span>최대 낙폭</span><b>—</b></div>';
      if (sigEl) sigEl.innerHTML = '<span class="badge-sig none">대기</span>봉 ' + (bars ? bars.length : 0) + '개 — 40봉 이상 필요';
      guide.innerHTML = '<p class="g-note">' + MP.escape(meta.name) + ' · ' + MP.escape(meta.desc) + '</p>';
      const tr0 = MP.$('#stratTrades');
      if (tr0) tr0.innerHTML = '';
      return;
    }

    const ind = indicatorsOf(bars);
    const sig = dedupeSignals(rawSignals(strategy, bars, ind));
    const bt = runBacktest(bars, sig);
    paintMarkers(sig);

    const price = bars[bars.length - 1].close;
    const sc = scenarioData;
    const atr = sc ? sc.atr : atrAt(bars, 14);
    const sup = sc ? sc.sup : Math.min.apply(null, bars.slice(-20).map((b) => b.low));
    const res = sc ? sc.res : Math.max.apply(null, bars.slice(-20).map((b) => b.high));
    const stop = Math.min(sup - atr * 0.5, price - atr * 1.5);
    const unit = Math.max(price - stop, atr * 0.5);
    const target = price + unit * 2;

    metrics.innerHTML =
      '<div class="m"><span>승률</span><b>' + (bt.winRate == null ? '—' : bt.winRate.toFixed(0) + '%') + '</b></div>' +
      '<div class="m"><span>누적 수익률</span><b class="' + (bt.cum > 0 ? 'up' : bt.cum < 0 ? 'down' : '') + '">' +
        (bt.cum == null ? '—' : (bt.cum > 0 ? '+' : '') + bt.cum.toFixed(1) + '%') + '</b></div>' +
      '<div class="m"><span>거래/신호</span><b>' + bt.n + '건/' + bt.count + '회</b></div>' +
      '<div class="m"><span>최대 낙폭</span><b>' + (bt.mdd == null ? '—' : bt.mdd.toFixed(1) + '%') + '</b></div>';

    const last = sig[sig.length - 1];
    if (sigEl) {
      sigEl.innerHTML = last
        ? '<span class="badge-sig ' + last.type + '">' + (last.type === 'buy' ? '매수' : '매도') + '</span>' +
          '최근 신호 ' + (bars.length - 1 - last.i) + '봉 전 · ' +
          (bt.open ? '포지션 보유(진입 ' + numFmt(bt.open.price) + ')' : '포지션 없음')
        : '<span class="badge-sig none">신호 없음</span>현재 조건에 해당하는 신호가 없습니다';
    }

    guide.innerHTML =
      '<div class="g"><span>지지</span><b>' + numFmt(sup) + '</b></div>' +
      '<div class="g"><span>저항</span><b>' + numFmt(res) + '</b></div>' +
      '<div class="g"><span>추천 손절</span><b class="down">' + numFmt(stop) + '</b></div>' +
      '<div class="g"><span>목표가(1:2)</span><b class="up">' + numFmt(target) + '</b></div>' +
      '<p class="g-note">' + MP.escape(meta.desc) +
        ' · 봉 ' + bars.length + '개 백테스트(수수료·슬리피지 미반영, ' + TF_LABEL[state.tf] + ')' +
        (bt.avg == null ? '' : ' · 거래당 평균 ' + (bt.avg > 0 ? '+' : '') + bt.avg.toFixed(1) + '%') +
        ' · 지지·저항 피벗·ATR 기준</p>';

    const trEl = MP.$('#stratTrades');
    if (trEl) {
      const last3 = bt.trades.slice(-3).reverse();
      trEl.innerHTML = last3.length
        ? '<li class="t-cap">최근 완료 거래 ' + last3.length + '건 (최신순)</li>' +
          last3.map((t) => '<li><b class="' + (t.ret > 0 ? 'up' : t.ret < 0 ? 'down' : '') + '">' +
            (t.ret > 0 ? '+' : '') + t.ret.toFixed(1) + '%</b><span>' + numFmt(t.in) + ' → ' + numFmt(t.out) +
            '</span><i>' + t.bars + '봉</i></li>').join('')
        : '<li class="t-cap">완료된 거래 없음</li>';
    }
  }

  /* ---------- AI 종목 판단 ---------- */
  const POS_WORDS = ['상승', '급등', '호실적', '돌파', '신고가', '수주', '흑자', '개선', '목표가 상향', '매수', '반등', '강세'];
  const NEG_WORDS = ['하락', '급락', '부진', '적자', '우려', '리스크', '하향', '소송', '조사', '매도', '약세', '악재'];

  function newsTone() {
    const key = String(nameOf(state.symbol) || '').replace(/\(.*?\)/g, '').replace(/\s/g, '');
    if (key.length < 2) return { n: 0, pos: 0, neg: 0 };
    const items = (MP.newsItems || []).filter((n) => n && n.title && n.title.replace(/\s/g, '').indexOf(key) >= 0).slice(0, 10);
    let pos = 0, neg = 0;
    items.forEach((n) => {
      POS_WORDS.forEach((w) => { if (n.title.indexOf(w) >= 0) pos++; });
      NEG_WORDS.forEach((w) => { if (n.title.indexOf(w) >= 0) neg++; });
    });
    return { n: items.length, pos: pos, neg: neg };
  }

  // 지그재그 피벗(좌우 k봉 고점/저점) — 다이버전스·지지저항 산출용
  function pivotsAt(list, k) {
    k = k || 2;
    const highs = [], lows = [];
    for (let i = k; i < list.length - k; i++) {
      let isH = true, isL = true;
      for (let j = i - k; j <= i + k; j++) {
        if (j === i) continue;
        if (list[j].high >= list[i].high) isH = false;
        if (list[j].low <= list[i].low) isL = false;
      }
      if (isH) highs.push(i);
      if (isL) lows.push(i);
    }
    return { highs: highs, lows: lows };
  }

  // 가격-RSI 괴리(다이버전스) 탐지 — 최근 60봉 구간
  function detectDivergence(list, rsi) {
    if (!list || list.length < 40) return null;
    const from = Math.max(1, list.length - 60);
    const sub = list.slice(from);
    const rs = rsi.slice(from);
    const pv = pivotsAt(sub, 2);
    if (pv.highs.length >= 2) {
      const a = pv.highs[pv.highs.length - 2], b = pv.highs[pv.highs.length - 1];
      if (sub[b].high > sub[a].high && rs[a] != null && rs[b] != null && rs[b] < rs[a] - 1) {
        return { kind: 'bear', t: '하락 다이버전스 — 고점 ' + numFmt(sub[a].high) + '→' + numFmt(sub[b].high) +
          ' 상승했지만 RSI ' + rs[a].toFixed(1) + '→' + rs[b].toFixed(1) + ' 동반 하락' };
      }
    }
    if (pv.lows.length >= 2) {
      const a = pv.lows[pv.lows.length - 2], b = pv.lows[pv.lows.length - 1];
      if (sub[b].low < sub[a].low && rs[a] != null && rs[b] != null && rs[b] > rs[a] + 1) {
        return { kind: 'bull', t: '상승 다이버전스 — 저점 ' + numFmt(sub[a].low) + '→' + numFmt(sub[b].low) +
          ' 하락했지만 RSI ' + rs[a].toFixed(1) + '→' + rs[b].toFixed(1) + ' 반등' };
      }
    }
    return null;
  }

  // 볼린저 밴드폭(%)과 20봉 평균 밴드폭 — 스퀴즈/확장 판단
  function bandWidthAt(ind, i) {
    const up = ind.bb.up[i], low = ind.bb.low[i], mid = ind.bb.mid[i];
    if (up == null || low == null || !mid) return null;
    const bw = (up - low) / mid * 100;
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, i - 19); j <= i; j++) {
      if (ind.bb.up[j] == null || ind.bb.low[j] == null || !ind.bb.mid[j]) continue;
      sum += (ind.bb.up[j] - ind.bb.low[j]) / ind.bb.mid[j] * 100;
      cnt++;
    }
    const avg = cnt ? sum / cnt : bw;
    return { bw: bw, avg: avg, ratio: avg ? bw / avg : 1 };
  }

  const sgn = (v, d) => (v > 0 ? '+' : '') + (d == null ? v.toFixed(1) : v.toFixed(d));

  function aiVerdict() {
    if (!bars || bars.length < 40) return null;
    const ind = indicatorsOf(bars);
    const i = bars.length - 1;
    const c = bars[i];
    const price = c.close;
    const atr = atrAt(bars, 14);
    const ev = [];

    const m5 = ind.ma5[i], m20 = ind.ma20[i], m60 = ind.ma60[i], m120 = ind.ma120[i];
    const disp20 = m20 ? (price / m20 - 1) * 100 : null;
    const disp60 = m60 ? (price / m60 - 1) * 100 : null;
    const disp120 = m120 ? (price / m120 - 1) * 100 : null;

    // 1) 이평선 배열 + 이격도
    if (m5 != null && m20 != null && m60 != null) {
      const aligned = m5 > m20 && m20 > m60;
      const reversed = m5 < m20 && m20 < m60;
      if (aligned) ev.push({ w: 11, t: '정배열 MA5(' + numFmt(m5) + ')>MA20(' + numFmt(m20) + ')>MA60(' + numFmt(m60) + ') · MA20 이격 ' + sgn(disp20) + '%' });
      else if (reversed) ev.push({ w: -11, t: '역배열 MA5(' + numFmt(m5) + ')<MA20(' + numFmt(m20) + ')<MA60(' + numFmt(m60) + ') · MA20 이격 ' + sgn(disp20) + '%' });
      else if (m5 > m20) ev.push({ w: 4, t: '단기 상승·중기 혼조 MA5 ' + numFmt(m5) + ' > MA20 ' + numFmt(m20) + ' · 이격 ' + sgn(disp20) + '%' });
      else ev.push({ w: -4, t: '단기 하락·중기 혼조 MA5 ' + numFmt(m5) + ' < MA20 ' + numFmt(m20) + ' · 이격 ' + sgn(disp20) + '%' });
    }
    if (m120 != null) {
      ev.push(price >= m120
        ? { w: 5, t: '장기선 MA120(' + numFmt(m120) + ') 상회 · 이격 ' + sgn(disp120) + '%' }
        : { w: -5, t: '장기선 MA120(' + numFmt(m120) + ') 하회 · 이격 ' + sgn(disp120) + '%' });
    }
    if (disp20 != null && disp20 >= 12) ev.push({ w: -5, t: 'MA20 이격 ' + sgn(disp20) + '% 과열 — 평균 회귀 부담' });
    else if (disp20 != null && disp20 <= -12) ev.push({ w: 5, t: 'MA20 이격 ' + sgn(disp20) + '% 낙폭 과대' });
    if (disp60 != null && Math.abs(disp60) >= 20) {
      ev.push({ w: disp60 > 0 ? -3 : 3, t: 'MA60 이격 ' + sgn(disp60) + '% — 추세 이탈 폭 큼' });
    }

    // 2) RSI + 다이버전스
    const r = ind.rsi[i];
    if (r != null) {
      if (r >= 70) ev.push({ w: -9, t: 'RSI(14) ' + r.toFixed(1) + ' 과매수(70↑) 부담' });
      else if (r <= 30) ev.push({ w: 9, t: 'RSI(14) ' + r.toFixed(1) + ' 과매도(30↓) 반등 구간' });
      else if (r >= 55) ev.push({ w: 3, t: 'RSI(14) ' + r.toFixed(1) + ' — 매수 우위 구간' });
      else if (r <= 45) ev.push({ w: -3, t: 'RSI(14) ' + r.toFixed(1) + ' — 매수세 약함' });
      else ev.push({ w: 0, t: 'RSI(14) ' + r.toFixed(1) + ' — 중립 구간' });
    }
    const dv = detectDivergence(bars, ind.rsi);
    if (dv) ev.push({ w: dv.kind === 'bull' ? 8 : -8, t: dv.t });

    // 3) MACD 크로스 + 히스토그램 증감
    const h = ind.macd.hist[i], hp = ind.macd.hist[i - 1], hpp = ind.macd.hist[i - 2];
    if (Number.isFinite(h)) {
      const slope = Number.isFinite(hp) ? h - hp : 0;
      ev.push(h > 0
        ? { w: 6, t: 'MACD 히스토그램 +' + compactNum(h) + ' (' + (slope >= 0 ? '증가' : '감소') + ') — 상승 모멘텀' }
        : { w: -6, t: 'MACD 히스토그램 ' + compactNum(h) + ' (' + (slope >= 0 ? '증가' : '감소') + ') — 하락 모멘텀' });
      if (Number.isFinite(hp) && (h > 0) !== (hp > 0)) {
        ev.push({ w: h > 0 ? 4 : -4, t: 'MACD 골든크로스 — 신호선 상향 돌파' });
      } else if (Number.isFinite(hp) && Number.isFinite(hpp) && Math.abs(slope) < Math.abs(hp - hpp) * 0.5) {
        ev.push({ w: 0, t: 'MACD 히스토그램 탄력 둔화 — 추세 지속성 약화' });
      }
    }

    // 4) 볼린저 %B + 밴드폭(스퀴즈/확장)
    const pb = ind.bb.pctB[i];
    const bwv = bandWidthAt(ind, i);
    if (pb != null) {
      if (pb > 0.95) ev.push({ w: -7, t: '볼린저 %B ' + pb.toFixed(2) + ' — 상단 이탈(과열)' });
      else if (pb < 0.05) ev.push({ w: 7, t: '볼린저 %B ' + pb.toFixed(2) + ' — 하단 이탈(낙폭과대)' });
      else ev.push({ w: 0, t: '볼린저 %B ' + pb.toFixed(2) + ' — 밴드 내 ' + (pb > 0.5 ? '상단' : '하단') + '권' });
    }
    if (bwv) {
      if (bwv.ratio <= 0.75) ev.push({ w: pb != null && pb > 0.9 ? 5 : 2, t: '밴드폭 ' + bwv.bw.toFixed(1) + '% (평균의 ' + bwv.ratio.toFixed(2) + '배) — 스퀴즈, 변동성 확대 임박' });
      else if (bwv.ratio >= 1.25) ev.push({ w: -2, t: '밴드폭 ' + bwv.bw.toFixed(1) + '% (평균의 ' + bwv.ratio.toFixed(2) + '배) — 확장 국면, 추세 소진 주의' });
      else ev.push({ w: 0, t: '밴드폭 ' + bwv.bw.toFixed(1) + '% (평균의 ' + bwv.ratio.toFixed(2) + '배) — 보통 수준' });
    }

    // 5) 거래량 vs 20봉 평균
    const v20 = bars.slice(-20).reduce((a, x) => a + (x.volume || 0), 0) / 20;
    const v5 = bars.slice(-5).reduce((a, x) => a + (x.volume || 0), 0) / 5;
    const volRatio = v20 > 0 ? (c.volume || 0) / v20 : 1;
    const vol5Ratio = v20 > 0 ? v5 / v20 : 1;
    if (volRatio >= 1.5) ev.push({ w: c.close >= c.open ? 5 : -5, t: '거래량 20봉 평균의 ' + volRatio.toFixed(1) + '배 — ' + (c.close >= c.open ? '매수 우위' : '매도 우위') });
    else if (volRatio <= 0.6) ev.push({ w: -3, t: '거래량 20봉 평균의 ' + volRatio.toFixed(1) + '배로 얇음' });
    ev.push({ w: vol5Ratio >= 1.2 && c.close >= c.open ? 2 : vol5Ratio <= 0.7 ? -2 : 0,
      t: '최근 5봉 거래량 20봉 평균의 ' + vol5Ratio.toFixed(1) + '배' });

    // 6) 레인지 내 위치
    const hi60 = Math.max.apply(null, bars.slice(-60).map((x) => x.high));
    const lo60 = Math.min.apply(null, bars.slice(-60).map((x) => x.low));
    const pos = hi60 > lo60 ? (price - lo60) / (hi60 - lo60) : 0.5;
    ev.push({ w: pos > 0.9 ? -3 : pos < 0.1 ? 3 : 0,
      t: '60봉 레인지 ' + (pos * 100).toFixed(0) + '% 위치 (저점 ' + numFmt(lo60) + ' / 고점 ' + numFmt(hi60) + ')' });

    // 7) 뉴스 키워드 감성
    const tone = newsTone();
    if (tone.n) {
      ev.push({ w: Math.max(-4, Math.min(4, tone.pos - tone.neg)),
        t: '관련 뉴스 ' + tone.n + '건 — 긍정 키워드 ' + tone.pos + ' · 부정 ' + tone.neg });
    }

    let score = 50 + ev.reduce((a, e) => a + e.w, 0);
    score = Math.max(0, Math.min(100, Math.round(score)));
    const reasons = ev.slice().sort((a, b) => Math.abs(b.w) - Math.abs(a.w)).slice(0, 4);

    // ATR 기반 지지·저항·손절·목표
    const swing = bars.slice(-80);
    const pv = pivotsAt(swing, 2);
    const lowsBelow = pv.lows.map((k) => swing[k].low).filter((v) => v < price).sort((a, b) => b - a);
    const highsAbove = pv.highs.map((k) => swing[k].high).filter((v) => v > price).sort((a, b) => a - b);
    const sup = lowsBelow.length ? lowsBelow[0] : price - atr * 1.5;
    const res = highsAbove.length ? highsAbove[0] : price + atr * 1.5;
    const stop = Math.min(sup - atr * 0.5, price - atr * 1.5);
    const unit = Math.max(price - stop, atr * 0.5);
    const target = price + unit * 2;

    const risks = [];
    if (price <= sup * 1.01) risks.push('지지선(' + numFmt(sup) + ')에 붙어 있음 — 이탈 시 1.5 ATR(' + numFmt(price - atr * 1.5) + ')까지 밀릴 수 있음');
    if (m60 != null && price < m60) risks.push('MA60(' + numFmt(m60) + ') 아래 — 추세 복귀 전 변동성 주의');
    if (r != null && r >= 70) risks.push('RSI ' + r.toFixed(1) + ' 과열 — 단기 조정 가능성');
    if (bwv && bwv.ratio <= 0.75) risks.push('밴드폭 스퀴즈 — 방향성 돌발 확대(상·하방 모두) 가능');
    if (vol5Ratio <= 0.8) risks.push('최근 5봉 거래량이 평균의 ' + vol5Ratio.toFixed(1) + '배 — 추세 신뢰도 낮음');
    if (dv && dv.kind === 'bear') risks.push('하락 다이버전스 — 상승 탄력 약화 신호');
    if (bars.length < 60) risks.push('봉 ' + bars.length + '개로 표본이 짧아 지표 신뢰도 제한');
    if (pb != null && pb < 0.05) risks.push('볼린저 하단 이탈 — 반등 확인 전 추가 하락 가능');
    if (!risks.length) risks.push('ATR ' + numFmt(atr) + ' 기준 ' + (atr / price * 100).toFixed(1) + '% 변동 — 분할 대응 권장');
    else if (risks.length < 2) risks.push('ATR(14) ' + numFmt(atr) + ' (' + (atr / price * 100).toFixed(1) + '%) 변동성 — 손절 라인 준수 필요');

    const hot = (r != null && r >= 72) || (pb != null && pb > 0.95) || (disp20 != null && disp20 >= 12);
    const cold = (r != null && r <= 28) || (pb != null && pb < 0.05) || (disp20 != null && disp20 <= -12);
    const badge = score >= 62 ? (hot ? '매수 우위 · 과열 주의' : '매수 우위')
      : score <= 38 ? (cold ? '매도 우위 · 과매도' : '매도 우위') : '중립 · 관망';

    const snap = {
      rsi: r == null ? null : r.toFixed(1),
      macd: Number.isFinite(h) ? (h > 0 ? '+' : '') + compactNum(h) : null,
      macdDir: Number.isFinite(hp) ? (h >= hp ? '증가' : '감소') : null,
      pb: pb == null ? null : pb.toFixed(2),
      bw: bwv ? bwv.bw.toFixed(1) + '%' : null,
      bwTag: bwv ? (bwv.ratio <= 0.75 ? '수축' : bwv.ratio >= 1.25 ? '확장' : '보통') : null,
      disp20: disp20 == null ? null : sgn(disp20) + '%',
      disp120: disp120 == null ? null : sgn(disp120) + '%',
      vol: volRatio.toFixed(1) + '배',
      atr: atr,
      atrPct: price ? (atr / price * 100) : null,
      div: dv ? dv.kind : null,
    };

    return { score: score, badge: badge, reasons: reasons, sup: sup, res: res, stop: stop, target: target,
      risks: risks.slice(0, 3), snap: snap, hot: hot, cold: cold };
  }

  function renderAI() {
    const badge = MP.$('#aiBadge'), scoreEl = MP.$('#aiScore'), needle = MP.$('#aiNeedle');
    const list = MP.$('#aiReasons'), sr = MP.$('#aiSR'), riskEl = MP.$('#aiRisk');
    const signEl = MP.$('#aiSign'), headSign = MP.$('#shSign'), indEl = MP.$('#aiInd');
    if (!badge || !scoreEl || !list) return;
    const v = aiVerdict();
    const paintSign = (kind, sub, title) => {
      if (signEl) {
        signEl.className = 'ai-sign ' + kind;
        signEl.title = sub;
        signEl.innerHTML =
          '<span class="ai-sign-ico">' + (kind === 'buy' ? '▲' : kind === 'sell' ? '▼' : '■') + '</span>' +
          '<span class="ai-sign-txt">' + (kind === 'buy' ? '매수' : kind === 'sell' ? '매도' : '중립') + '</span>';
      }
      if (headSign) {
        headSign.className = 'sign-badge ' + kind;
        headSign.textContent = kind === 'buy' ? '▲ 매수' : kind === 'sell' ? '▼ 매도' : '■ 중립';
        headSign.title = title || 'AI 종목 판단 사인';
      }
    };
    if (!v) {
      badge.className = 'score-badge flat';
      badge.textContent = '데이터 부족';
      scoreEl.textContent = '—';
      scoreEl.className = '';
      if (needle) { needle.style.left = '50%'; needle.style.background = 'var(--muted)'; }
      paintSign('neutral', '데이터 부족', '봉 데이터 40개 이상 필요');
      list.innerHTML = '<li>봉 데이터가 40개 이상 쌓이면 판단을 시작합니다.</li>';
      if (indEl) indEl.innerHTML = '';
      if (sr) sr.innerHTML = '';
      if (riskEl) riskEl.innerHTML = '';
      return;
    }
    const kind = v.score >= 62 ? 'buy' : v.score <= 38 ? 'sell' : 'neutral';
    const cls = kind === 'buy' ? 'up' : kind === 'sell' ? 'down' : 'flat';
    badge.className = 'score-badge ' + cls;
    badge.textContent = v.badge;
    scoreEl.textContent = v.score + '점';
    scoreEl.className = cls;
    if (needle) {
      needle.style.left = Math.max(2, Math.min(98, v.score)) + '%';
      needle.style.background = cls === 'up' ? 'var(--up)' : cls === 'down' ? 'var(--down)' : 'var(--text)';
    }
    paintSign(kind, '종합 ' + v.score + '점', 'AI 종합 ' + v.score + '점 — ' + v.badge);
    if (indEl && v.snap) {
      const s = v.snap;
      const chip = (k, val, cls) => '<span class="ind-chip' + (cls ? ' ' + cls : '') + '">' + k + ' <b>' + MP.escape(val) + '</b></span>';
      indEl.innerHTML =
        (s.rsi != null ? chip('RSI', s.rsi) : '') +
        (s.macd != null ? chip('MACD', s.macd + (s.macdDir ? ' ' + s.macdDir : '')) : '') +
        (s.pb != null ? chip('%B', s.pb) : '') +
        (s.bw != null ? chip('밴드폭', s.bw + (s.bwTag ? ' ' + s.bwTag : ''), s.bwTag === '수축' ? 'hot' : '') : '') +
        (s.disp20 != null ? chip('MA20이격', s.disp20) : '') +
        (s.vol != null ? chip('거래량', s.vol) : '') +
        (s.div ? chip('괴리', s.div === 'bull' ? '상승' : '하락', s.div === 'bull' ? 'up' : 'down') : '');
    }
    list.innerHTML = v.reasons.map((x) => '<li>' + MP.escape(x.t) + '</li>').join('');
    if (sr) {
      sr.innerHTML =
        '<span>지지 <b>' + numFmt(v.sup) + '</b></span>' +
        '<span>저항 <b>' + numFmt(v.res) + '</b></span>' +
        '<span>손절 <b class="down">' + numFmt(v.stop) + '</b></span>' +
        '<span>목표(1:2) <b class="up">' + numFmt(v.target) + '</b></span>';
    }
    if (riskEl) riskEl.innerHTML = v.risks.map((t) => '<li>' + MP.escape(t) + '</li>').join('');
  }

  /* ---------- 예상 시나리오 (차트 경로선 + 글 요약) ---------- */
  function atrAt(list, n) {
    n = n || 14;
    let sum = 0, cnt = 0;
    for (let i = list.length - n; i < list.length; i++) {
      if (i <= 0) continue;
      const tr = Math.max(
        list[i].high - list[i].low,
        Math.abs(list[i].high - list[i - 1].close),
        Math.abs(list[i].low - list[i - 1].close)
      );
      sum += tr; cnt++;
    }
    if (cnt) return sum / cnt;
    const b = list[list.length - 1];
    return Math.max(b.high - b.low, b.close * 0.01);
  }

  function barStep() {
    if (!bars || bars.length < 3) return 86400;
    const d1 = bars[bars.length - 1].time - bars[bars.length - 2].time;
    const d2 = bars[bars.length - 2].time - bars[bars.length - 3].time;
    const v = Math.round((d1 + d2) / 2);
    return v > 0 ? v : 86400;
  }

  function horizonBars() {
    if (state.tf === 'D') return 10;
    if (state.tf === 'W' || state.tf === 'M') return 6;
    return 16;
  }

  function computeScenario() {
    if (!bars || bars.length < 40) return null;
    const last = bars[bars.length - 1];
    const price = last.close;
    const atr = atrAt(bars, 14);
    const swing = bars.slice(-80);
    const pv = pivotsAt(swing, 2);
    const lowsBelow = pv.lows.map((k) => swing[k].low).filter((v) => v < price).sort((a, b) => b - a);
    const highsAbove = pv.highs.map((k) => swing[k].high).filter((v) => v > price).sort((a, b) => a - b);
    const sup = lowsBelow.length ? lowsBelow[0] : price - atr * 1.5;
    const res = highsAbove.length ? highsAbove[0] : price + atr * 1.5;

    // ATR(14) 배수로 만든 현실적 목표 — 지지/저항이 1.5 ATR 안이면 그 레벨을 1차 관문으로 사용
    const nearRes = res <= price + atr * 1.5;
    const nearSup = sup >= price - atr * 1.5;
    const bull1 = nearRes ? res + atr * 0.5 : price + atr * 1.5;
    const bull2 = nearRes ? res + atr * 2 : price + atr * 3;
    const bear1 = nearSup ? sup - atr * 0.5 : price - atr * 1.5;
    const bear2 = nearSup ? sup - atr * 2 : price - atr * 3;
    const boxMid = (sup + res) / 2;
    const flat = Math.max(price - atr * 0.5, Math.min(price + atr * 0.5, boxMid));

    return {
      price: price, atr: atr, sup: sup, res: res,
      bull: bull1, bull2: bull2, bear: bear1, bear2: bear2, flat: flat,
      nearRes: nearRes, nearSup: nearSup,
      horizon: horizonBars(), step: barStep(), lastTime: last.time,
      bullPct: price ? (bull1 / price - 1) * 100 : 0,
      bull2Pct: price ? (bull2 / price - 1) * 100 : 0,
      bearPct: price ? (bear1 / price - 1) * 100 : 0,
      bear2Pct: price ? (bear2 / price - 1) * 100 : 0,
      atrPct: price ? (atr / price) * 100 : 0,
    };
  }

  function applyScenarioSeries(sc) {
    if (!mainChart) return;
    Object.keys(scenSeries).forEach((k) => {
      if (scenSeries[k]) { try { mainChart.removeSeries(scenSeries[k]); } catch (e) {} }
      delete scenSeries[k];
    });
    if (!sc) return;
    const p = palette();
    const mk = (color, target) => {
      const s = mainChart.addLineSeries({
        color: color, lineWidth: 1.7, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const data = [{ time: sc.lastTime, value: sc.price }];
      for (let k = 1; k <= sc.horizon; k++) {
        const f = k / sc.horizon;
        const ease = 1 - Math.pow(1 - f, 1.8);
        data.push({ time: sc.lastTime + sc.step * k, value: sc.price + (target - sc.price) * ease });
      }
      s.setData(data);
      return s;
    };
    scenSeries.bullS = mk(p.up, sc.bull);
    scenSeries.flatS = mk(p.muted, sc.flat);
    scenSeries.bearS = mk(p.down, sc.bear);
  }

  function renderScenario(sc) {
    const list = MP.$('#scenList');
    const hz = MP.$('#scenHorizon');
    if (!list) return;
    if (!sc) {
      if (hz) hz.textContent = '—';
      list.innerHTML = '<li class="scen-flat"><b>대기</b><span>봉 데이터가 40개 이상이면 시나리오를 계산합니다.</span></li>';
      return;
    }
    if (hz) hz.textContent = '향후 ' + sc.horizon + '봉(' + (TF_LABEL[state.tf] || '') + ') · ATR(14) ' + numFmt(sc.atr) + ' (' + sc.atrPct.toFixed(1) + '%)';
    const fp = (v) => (v > 0 ? '+' : '') + v.toFixed(1) + '%';
    const bullTxt = (sc.nearRes ? '저항 <em>' + numFmt(sc.res) + '</em> 돌파 → ' : '') +
      '1차 <em>' + numFmt(sc.bull) + '</em>(' + fp(sc.bullPct) + ') · 2차 <em>' + numFmt(sc.bull2) + '</em>(' + fp(sc.bull2Pct) + ')' +
      (sc.nearRes ? '' : ' — 저항 <em>' + numFmt(sc.res) + '</em> 돌파 시 추세 전환');
    const bearTxt = (sc.nearSup ? '지지 <em>' + numFmt(sc.sup) + '</em> 이탈 → ' : '') +
      '1차 <em>' + numFmt(sc.bear) + '</em>(' + fp(sc.bearPct) + ') · 2차 <em>' + numFmt(sc.bear2) + '</em>(' + fp(sc.bear2Pct) + ')' +
      (sc.nearSup ? '' : ' — 지지 <em>' + numFmt(sc.sup) + '</em> 이탈 시 하락 가속');
    list.innerHTML =
      '<li class="scen-bull"><b>강세</b><span>' + bullTxt + '</span></li>' +
      '<li class="scen-flat"><b>중립</b><span>지지 <em>' + numFmt(sc.sup) + '</em> ~ 저항 <em>' + numFmt(sc.res) +
        '</em> 박스 등락, 중심 <em>' + numFmt(sc.flat) + '</em> 부근 횡보</span></li>' +
      '<li class="scen-bear"><b>약세</b><span>' + bearTxt + '</span></li>';
  }

  function drawScenarioLabels(w, h, p) {
    const sc = scenarioData;
    if (!sc || !drawCtx || !mainChart || !candleSeries) return;
    const xLast = xOf(sc.lastTime);
    const xEnd = xOf(sc.lastTime + sc.step * sc.horizon);
    if (xLast == null || xEnd == null) return;
    drawCtx.save();
    drawCtx.strokeStyle = p.muted;
    drawCtx.globalAlpha = .45;
    drawCtx.setLineDash([2, 4]);
    drawCtx.beginPath();
    drawCtx.moveTo(xLast, 0);
    drawCtx.lineTo(xLast, h);
    drawCtx.stroke();
    drawCtx.setLineDash([]);
    drawCtx.globalAlpha = 1;
    drawCtx.fillStyle = p.dim || p.muted;
    drawCtx.font = '9px Pretendard, system-ui, sans-serif';
    drawCtx.fillText('예측', xLast + 3, 11);

    const rows = [
      { name: '강세', price: sc.bull, color: p.up, dy: -7 },
      { name: '중립', price: sc.flat, color: p.muted, dy: 12 },
      { name: '약세', price: sc.bear, color: p.down, dy: 12 },
    ];
    drawCtx.font = '700 9.5px Pretendard, system-ui, sans-serif';
    rows.forEach((r) => {
      const y = yOf(r.price);
      if (y == null || y < -20 || y > h + 20) return;
      const txt = r.name + ' ' + numFmt(r.price);
      const tw = drawCtx.measureText(txt).width;
      let tx = Math.min(xEnd - tw - 2, w - tw - 8);
      if (tx < 2) tx = 2;
      const ty = Math.max(11, Math.min(h - 4, y + r.dy));
      drawCtx.fillStyle = p.bg;
      drawCtx.globalAlpha = .9;
      drawCtx.fillRect(tx - 4, ty - 9.5, tw + 8, 13);
      drawCtx.globalAlpha = 1;
      drawCtx.fillStyle = r.color;
      drawCtx.fillText(txt, tx, ty);
    });
    drawCtx.restore();
  }

  function renderAnalytics() {
    scenarioData = computeScenario();
    applyScenarioSeries(scenarioData);
    renderStrategy();
    renderAI();
    renderScenario(scenarioData);
    drawOverlay();
  }

  /* ---------- 초기화 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    buildCharts();
    setupCanvas();
    initSearch();
    renderHead();
    renderLinks();
    renderMemo();

    // 타임프레임
    MP.$$('.tf').forEach((b) => b.addEventListener('click', () => {
      const tf = b.dataset.tf;
      if (b.classList.contains('is-disabled')) {
        MP.toast('이 종목은 해당 주기를 지원하지 않습니다');
        return;
      }
      setTF(tf);
    }));

    // 매매전략 선택
    const stratSel = MP.$('#stratSelect');
    if (stratSel) stratSel.addEventListener('change', () => {
      strategy = STRATEGY[stratSel.value] ? stratSel.value : 'ma';
      renderStrategy();
      MP.toast('전략: ' + STRATEGY[strategy].name);
    });

    // 지표 토글
    MP.$$('.chip[data-ind]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.ind;
      state.inds[k] = !state.inds[k];
      b.classList.toggle('is-active', state.inds[k]);
      applyIndicators();
    }));

    // 줌
    const zoom = (factor) => {
      const ts = mainChart.timeScale();
      const r = ts.getVisibleLogicalRange();
      if (!r) return;
      const mid = (r.from + r.to) / 2;
      const half = (r.to - r.from) / 2 * factor;
      ts.setVisibleLogicalRange({ from: mid - half, to: mid + half });
      drawOverlay();
    };
    const zi = MP.$('#zoomIn'); if (zi) zi.addEventListener('click', () => zoom(0.75));
    const zo = MP.$('#zoomOut'); if (zo) zo.addEventListener('click', () => zoom(1.35));
    const zf = MP.$('#zoomFit'); if (zf) zf.addEventListener('click', () => { mainChart.timeScale().fitContent(); drawOverlay(); });

    // 넓게 보기 / 패널 접기
    const wide = MP.$('#wideBtn');
    if (wide) wide.addEventListener('click', () => {
      const on = document.body.classList.toggle('wide');
      wide.textContent = on ? '기본 보기' : '넓게 보기';
      setTimeout(() => { layoutCharts(); }, 260);
    });
    const pt = MP.$('#panelToggle');
    if (pt) pt.addEventListener('click', () => {
      document.body.classList.toggle('panel-hidden');
      setTimeout(() => layoutCharts(), 260);
    });

    // 우측 패널 탭 (뉴스/공시/메모)
    const infoTabs = MP.$('#infoTabs');
    if (infoTabs) {
      infoTabs.addEventListener('click', (e) => {
        const b = e.target.closest('.ptab');
        if (!b) return;
        MP.$$('#infoTabs .ptab').forEach((x) => x.classList.toggle('is-active', x === b));
        MP.$$('.panel-body .pane').forEach((p) => p.classList.toggle('is-active', p.dataset.pane === b.dataset.pane));
      });
    }

    // 테마 태그 클릭 → 같은 테마 종목 필터
    const themesEl = MP.$('#shThemes');
    if (themesEl) themesEl.addEventListener('click', (e) => {
      const b = e.target.closest('.theme-tag');
      if (!b) return;
      MP.emit('theme-filter', b.dataset.theme);
    });

    // 관심 담기
    const star = MP.$('#shWatch');
    if (star) star.addEventListener('click', () => {
      if (MP.addWatch) MP.addWatch(state.symbol, nameOf(state.symbol));
    });

    // 메모 저장
    const save = MP.$('#memoSave');
    if (save) save.addEventListener('click', () => {
      const box = MP.$('#memoBox');
      if (!box) return;
      const arr = MP.store.get('mp.watch', []) || [];
      const it = arr.find((x) => x.symbol === state.symbol);
      if (!it) {
        if (MP.addWatch) MP.addWatch(state.symbol, nameOf(state.symbol));
      }
      const arr2 = MP.store.get('mp.watch', []) || [];
      const it2 = arr2.find((x) => x.symbol === state.symbol);
      if (it2) { it2.note = box.value.trim(); MP.store.set('mp.watch', arr2); MP.emit('list-refresh'); MP.toast('메모를 저장했습니다'); }
    });
    const del = MP.$('#memoDel');
    if (del) del.addEventListener('click', () => {
      const box = MP.$('#memoBox');
      if (box) box.value = '';
      const arr = MP.store.get('mp.watch', []) || [];
      const it = arr.find((x) => x.symbol === state.symbol);
      if (it) { it.note = ''; MP.store.set('mp.watch', arr); MP.emit('list-refresh'); MP.toast('메모를 지웠습니다'); }
    });

    // 외부에서 심볼 선택
    MP.on('select-symbol', (d) => selectSymbol(typeof d === 'string' ? d : d && d.symbol));

    // 테마 변경 시 차트 재구성
    MP.on('theme', () => {
      barCache.clear();
      buildCharts();
      loadChart();
      drawOverlay();
    });

    // 실시간 가격 반영
    MP.on('tick', () => { if (isCoin()) renderHead(); });
    MP.on('quotes', () => { renderHead(); renderMemo(); });

    const q = new URLSearchParams(location.search).get('symbol');
    selectSymbol(q || 'UPBIT:BTCKRW');
  });

  MP.terminal = { state, selectSymbol };
})();
