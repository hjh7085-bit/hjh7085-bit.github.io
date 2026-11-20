/* 분할매수·손익비(R:R) 계산기 (1·2·3차 비중) — scale-in-rr/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var budget = get('budget') * 10000;
    var legs = [];
    for (var i = 1; i <= 3; i++) {
      var p = get('p' + i), w = get('w' + i);
      if (isFinite(p) && p > 0 && isFinite(w) && w > 0) legs.push({ p: p, w: w, n: i });
    }
    if (!legs.length) return null;
    var wSum = legs.reduce(function (a, b) { return a + b.w; }, 0);
    var invest = 0, qty = 0;
    var rows = [], table = [];
    legs.forEach(function (l) {
      var amt = budget * l.w / 100;
      var q = amt / l.p;
      invest += amt; qty += q;
      table.push([l.n + '차', fmt(l.w) + '%', won(amt), fmt(Math.floor(q)) + '주', won(l.p)]);
    });
    var avg = invest / qty;
    var target = get('target'), stop = get('stop'), wr = get('winrate');
    var gainPer = target - avg, lossPer = avg - stop;
    var gainAmt = gainPer * qty, lossAmt = lossPer * qty;
    var gainRate = gainPer / avg * 100, lossRate = lossPer / avg * 100;
    var rr = lossPer > 0 ? gainPer / lossPer : 0;
    var beWin = rr > 0 ? 100 / (1 + rr) : 0;
    var ev = isFinite(wr) && wr > 0 ? (wr / 100) * gainAmt - (1 - wr / 100) * lossAmt : null;

    rows.push({ k: '총 투입금', v: won(invest), note: '비중 합 ' + fmt(wSum) + '%' });
    rows.push({ k: '총 수량', v: fmt(Math.floor(qty)) + '주' });
    rows.push({ k: '평균단가', v: won(avg), total: true });
    rows.push({ k: '목표가 (' + won(target) + ') 수익', v: '+' + won(gainAmt), cls: 'is-good', note: '+' + pct(gainRate, 2) });
    rows.push({ k: '손절가 (' + won(stop) + ') 손실', v: '-' + won(lossAmt), cls: 'is-bad', note: '-' + pct(lossRate, 2) });
    rows.push({ k: '손익비 (R:R)', v: '1 : ' + fmt(rr, 2), total: true });
    rows.push({ k: '손익분기 승률', v: pct(beWin, 1), note: '이 승률보다 높아야 이익' });
    if (ev !== null) rows.push({ k: '기대값 (승률 ' + fmt(wr) + '%)', v: (ev >= 0 ? '+' : '') + won(ev), cls: ev >= 0 ? 'is-good' : 'is-bad' });

    var cls = rr >= 2 ? 'verdict--ok' : rr >= 1 ? 'verdict--warn' : 'verdict--bad';
    var msg = rr >= 2 ? '손익비 ' + fmt(rr, 2) + '배면 승률이 ' + pct(beWin, 0) + '만 넘어도 기대값이 플러스입니다.'
            : rr >= 1 ? '손익비가 ' + fmt(rr, 2) + '배라 승률 ' + pct(beWin, 0) + ' 이상이 필요합니다. 목표가를 올리거나 손절가를 좁혀 R:R를 개선하세요.'
            : '손익비가 1 미만입니다. 이겨도 지는 것보다 적게 버는 구조라 승률이 매우 높아야 수익이 납니다.';

    return {
      verdict: {
        kicker: '평균단가 · 손익비', icon: rr >= 2 ? '🎯' : rr >= 1 ? '⚖️' : '⚠️',
        title: '평단 ' + won(avg) + ' · R:R 1:' + fmt(rr, 2),
        desc: msg + ' 목표가까지 <b>' + pct(gainRate, 1) + '</b>, 손절가까지 <b>' + pct(lossRate, 1) + '</b>입니다.',
        cls: cls
      },
      stats: [
        { l: '평균단가', v: won(avg), cls: 'is-accent' },
        { l: '손익비', v: '1 : ' + fmt(rr, 2) },
        { l: '손익분기 승률', v: pct(beWin, 1) },
        { l: '기대값', v: ev === null ? '-' : ((ev >= 0 ? '+' : '') + wonShort(ev)), cls: ev !== null && ev >= 0 ? 'is-good' : 'is-bad' }
      ],
      rows: rows,
      bars: [
        { l: '목표 수익', v: Math.max(0, gainAmt), max: Math.max(gainAmt, lossAmt, 1), text: '+' + wonShort(gainAmt), color: 'bar__fill--green' },
        { l: '손절 손실', v: lossAmt, max: Math.max(gainAmt, lossAmt, 1), text: '-' + wonShort(lossAmt), color: 'bar__fill--kcal' }
      ],
      table: { head: ['차수', '비중', '투입금', '수량', '매수가'], rows: table,
               note: '수량은 소수점으로 계산해 평단을 정확히 구하고, 표에는 내림으로 표시했습니다.' },
      notes: [
        { html: '<b>R:R만 보지 말고 승률과 함께</b> — R:R 1:3이어도 승률이 20%면 기대값은 마이너스입니다. 손익분기 승률(1 ÷ (1+R))을 넘길 자신이 있는지 먼저 따져보세요.' },
        { html: '분할매수는 <b>비중을 미리 정하는 것</b>이 핵심입니다. 1차에 100% 넣으면 분할매수가 아니라 단타입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["budget", "p1", "w1", "p2", "w2", "p3", "w3", "target", "stop", "winrate"],
    segs: [],
    checks: [],
    required: ["budget", "p1", "w1", "target", "stop"],
    presets: {"1,000만 · 10/9/8만": {"fields": {"budget": 1000, "p1": 10000, "w1": 40, "p2": 9000, "w2": 35, "p3": 8000, "w3": 25, "target": 13000, "stop": 8500, "winrate": 45}}, "500만 · 5/4.5/4만": {"fields": {"budget": 500, "p1": 50000, "w1": 50, "p2": 45000, "w2": 30, "p3": 40000, "w3": 20, "target": 60000, "stop": 42000, "winrate": 40}}, "2,000만 · 2차만": {"fields": {"budget": 2000, "p1": 32000, "w1": 60, "p2": 29000, "w2": 40, "p3": 0, "w3": 0, "target": 40000, "stop": 27000, "winrate": 50}}},
    validate: null,
    compute: compute
  });
})();
