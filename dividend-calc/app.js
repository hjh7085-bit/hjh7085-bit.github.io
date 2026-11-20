/* 배당주 배당금 계산기 (월별 배당·세후 수익률) — dividend-calc/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var amount = get('amount') * 10000;
    var price = get('price');
    var dps = get('dps');
    var cycle = Math.max(1, Math.round(get('cycle') || 4));
    var growth = (get('growth') || 0) / 100;
    var years = Math.max(1, Math.round(get('years') || 5));
    var taxRate = (isFinite(get('taxRate')) ? get('taxRate') : 15.4) / 100;

    var shares = Math.floor(amount / price);
    var invested = shares * price;
    var yieldRate = dps / price * 100;
    var annualGross = shares * dps;
    var annualNet = annualGross * (1 - taxRate);
    var perPayGross = annualGross / cycle;
    var perPayNet = annualNet / cycle;
    var monthlyAvg = annualNet / 12;

    // 월별 달력 (분기 배당은 3·6·9·12월 지급으로 가정)
    var monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    var payMonths = [];
    for (var m = 1; m <= 12; m++) {
      var isPay = false;
      if (cycle === 12) isPay = true;
      else if (cycle === 4) isPay = m % 3 === 0;
      else if (cycle === 2) isPay = m % 6 === 0;
      else if (cycle === 1) isPay = m === 12;
      else isPay = (12 % cycle === 0) ? (m % (12 / cycle) === 0) : (m === 12);
      payMonths.push(isPay);
    }
    var bars = payMonths.map(function (isPay, i) {
      return { l: monthNames[i], v: isPay ? perPayNet : 0, max: perPayNet || 1,
               text: isPay ? wonShort(perPayNet) : '—', color: isPay ? 'bar__fill--green' : 'bar__fill--accent', hidden: !isPay };
    });

    // 재투자 시뮬레이션
    var sim = [], sh = shares, d = dps, cum = 0, px = price;
    for (var y = 1; y <= Math.min(years, 30); y++) {
      var gross = sh * d, net = gross * (1 - taxRate);
      cum += net;
      var addSh = Math.floor(net / px);
      sh += addSh;
      sim.push([y + '년차', fmt(sh) + '주', won(gross), won(net), wonShort(cum)]);
      d = d * (1 + growth);
      px = px * 1.0;
    }
    var finalValue = sh * price;

    return {
      verdict: {
        kicker: '연 세후 배당금', icon: '💵',
        title: won(annualNet) + ' <span class="small muted">/ 년</span>',
        desc: '월 평균 <b>' + won(monthlyAvg) + '</b>입니다. 세전 배당금은 <b>' + won(annualGross) + '</b>이고, 세금으로 <b>' + won(annualGross - annualNet) + '</b>을 냅니다. '
              + '배당수익률 ' + pct(yieldRate, 2) + ' → 세후 <b>' + pct(yieldRate * (1 - taxRate), 2) + '</b>.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '보유 주식수', v: fmt(shares) + '주' },
        { l: '세후 배당수익률', v: pct(yieldRate * (1 - taxRate), 2), cls: 'is-good' },
        { l: '1회 지급액(세후)', v: won(perPayNet), s: '연 ' + cycle + '회' },
        { l: years + '년 누적 배당', v: wonShort(cum) }
      ],
      rows: [
        { k: '투자금', v: won(amount) },
        { k: '실제 매수 금액', v: won(invested), note: '잔액 ' + won(amount - invested) },
        { k: '연 배당금 (세전)', v: won(annualGross) },
        { k: '배당소득세 (' + fmt(taxRate * 100, 1) + '%)', v: '-' + won(annualGross - annualNet) },
        { k: '연 배당금 (세후)', v: won(annualNet), total: true },
        { k: '월 평균 (세후)', v: won(monthlyAvg) },
        { k: '배당 재투자 후 평가액', v: won(finalValue), note: years + '년 후 · 주가 불변 가정' }
      ],
      bars: bars,
      table: { head: ['연차', '보유 주식수', '세전 배당', '세후 배당', '누적 배당'], rows: sim,
               note: '세후 배당금으로 같은 가격의 주식을 다시 산다고 가정했습니다. 주가 변동은 반영하지 않았습니다.' },
      notes: [
        { html: '<b>배당락</b>을 주의하세요. 배당 지급이 결정되면 주가는 배당금만큼 떨어지는 경향이 있어, 배당을 받는 것과 주가 하락이 상쇄될 수 있습니다. 배당 직전 매수는 세금만 내는 결과가 되기도 합니다.' },
        { html: annualGross > 20000000 ? '<b>금융소득 종합과세 주의</b>: 연 배당금이 2,000만원을 넘으면 다른 소득과 합산해 6~45% 누진세율이 적용됩니다. 이 계산기의 15.4%보다 세금이 커질 수 있습니다.' : '<b>금융소득 2,000만원</b>까지는 15.4% 분리과세입니다. 배당소득이 이 선을 넘으면 종합과세로 세율이 올라갑니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["amount", "price", "dps", "cycle", "growth", "years", "taxRate"],
    segs: [],
    checks: [],
    required: ["amount", "price", "dps"],
    presets: {"1,000만 · 배당 4%": {"fields": {"amount": 1000, "price": 50000, "dps": 2000, "cycle": 4, "growth": 3, "years": 5, "taxRate": 15.4}}, "3,000만 · 배당 5.5%": {"fields": {"amount": 3000, "price": 12000, "dps": 660, "cycle": 4, "growth": 2, "years": 5, "taxRate": 15.4}}, "500만 · 월배당 6%": {"fields": {"amount": 500, "price": 10000, "dps": 600, "cycle": 12, "growth": 0, "years": 5, "taxRate": 15.4}}},
    validate: null,
    compute: compute
  });
})();
