/* 주식 물타기·추가매수 평단가 계산기 (3차까지) — avg-price/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var q0 = get('qty0') || 0, a0 = get('avg0') || 0;
    var tranches = [];
    for (var i = 1; i <= 3; i++) {
      var p = get('price' + i), q = get('qty' + i);
      if (isFinite(p) && isFinite(q) && p > 0 && q > 0) tranches.push({ p: p, q: q, n: i });
    }
    var now = get('now');

    var qty = q0, cost = q0 * a0;
    var rows = [{ k: '보유 (물타기 전)', v: won(q0 * a0), note: fmt(q0) + '주 × ' + won(a0) }];
    tranches.forEach(function (t) {
      var amt = t.p * t.q;
      qty += t.q; cost += amt;
      rows.push({ k: t.n + '차 추가 매수', v: won(amt), note: fmt(t.q) + '주 × ' + won(t.p) });
    });
    var avg = qty > 0 ? cost / qty : 0;
    var drop = a0 > 0 ? (avg - a0) / a0 * 100 : 0;
    var btRate = a0 > 0 ? (a0 - avg) / avg * 100 : 0;

    rows.push({ k: '총 보유 수량', v: fmt(qty) + '주' });
    rows.push({ k: '총 투입금', v: won(cost), total: false });
    rows.push({ k: '새 평단가', v: won(avg), total: true });

    var evalRows = [], pl = null, plRate = null;
    if (isFinite(now) && now > 0) {
      var value = qty * now;
      pl = value - cost;
      plRate = cost > 0 ? pl / cost * 100 : 0;
      rows.push({ k: '현재 평가액', v: won(value), note: fmt(qty) + '주 × ' + won(now) });
      rows.push({ k: '평가손익', v: (pl > 0 ? '+' : '') + won(pl), cls: pl >= 0 ? 'is-good' : 'is-bad', note: (plRate > 0 ? '+' : '') + pct(plRate, 2) });
    }

    var addCost = cost - q0 * a0;
    var verdictDesc = tranches.length
      ? '평단가 ' + won(a0) + ' → <b>' + won(avg) + '</b> (' + (drop <= 0 ? '' : '+') + pct(drop, 2) + '). '
        + '본전까지 <b>' + pct(btRate, 2) + '</b> 상승이 필요합니다. 추가 투입금은 <b>' + won(addCost) + '</b>입니다.'
      : '추가 매수 없이 현재 평단가 그대로입니다. 아래에 추가 매수 가격·수량을 넣으면 새 평단가를 계산합니다.';

    var scenarios = [0.9, 0.8, 0.7].map(function (m) {
      var p = avg * m;
      var q = Math.floor(addCost > 0 ? addCost / p : cost / p);
      var q2 = qty + q, c2 = cost + q * p;
      return [pct((m - 1) * 100, 0) + ' 추가 하락 (' + won(p) + ')', fmt(q) + '주', won(c2 / q2), pct((c2 / q2 - avg) / avg * 100, 2)];
    });

    return {
      verdict: {
        kicker: '물타기 후 평단가', icon: tranches.length ? '📉' : '📊',
        title: won(avg),
        desc: verdictDesc,
        cls: drop < 0 ? 'verdict--ok' : 'verdict--accent'
      },
      stats: [
        { l: '새 평단가', v: won(avg), cls: 'is-accent' },
        { l: '평단 변화', v: (drop <= 0 ? '' : '+') + pct(drop, 1), cls: drop <= 0 ? 'is-good' : 'is-bad' },
        { l: '본전까지', v: pct(btRate, 1) + '↑', s: '현재 평단 대비' },
        { l: '총 투입금', v: wonShort(cost), s: fmt(qty) + '주' }
      ],
      rows: rows,
      table: { head: ['추가 하락 시나리오', '매수 가능 수량', '새 평단가', '평단 변화'], rows: scenarios,
               note: '남은 투입금(추가 매수에 쓴 금액)으로 같은 금액을 더 살 수 있다고 가정한 값입니다.' },
      notes: [
        { html: '<b>평단가가 낮아지는 것과 손실이 줄어드는 것은 다릅니다.</b> 8만원 100주가 6.5만원이면 평가손실 150만원입니다. 여기에 6만원 50주를 더 사면 평단은 7.3만원으로 내려가지만, 총 투입금이 1,100만원으로 늘어 <b>하락 시 손실 절대액은 오히려 커집니다</b>.' },
        { html: '물타기는 ① 현금 여유 ② 분할 계획 ③ 손절 기준이 있을 때만 의미가 있습니다. "본전 오면 팔겠다"는 계획만으로는 위험합니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["qty0", "avg0", "price1", "qty1", "price2", "qty2", "price3", "qty3", "now"],
    segs: [],
    checks: [],
    required: ["qty0", "avg0"],
    presets: {"평단 8만 · 100주 + 6만 50주": {"fields": {"qty0": 100, "avg0": 80000, "price1": 70000, "qty1": 30, "price2": 60000, "qty2": 50, "price3": "", "qty3": "", "now": 65000}}, "평단 12만 · 50주 + 9만 30주": {"fields": {"qty0": 50, "avg0": 120000, "price1": 100000, "qty1": 20, "price2": 90000, "qty2": 30, "price3": "", "qty3": "", "now": 95000}}, "평단 5만 · 200주 3차 물타기": {"fields": {"qty0": 200, "avg0": 50000, "price1": 45000, "qty1": 100, "price2": 40000, "qty2": 100, "price3": 35000, "qty3": 100, "now": 38000}}},
    validate: null,
    compute: compute
  });
})();
