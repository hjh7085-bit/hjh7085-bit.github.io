/* 예금·적금 이자 계산기 (단리·월복리·이자소득세 15.4%) — deposit-interest/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var TAX = { normal: 0.154, none: 0, low: 0.095 };

  function interest(P, M, r, n, method, isSaving) {
    var i = r / 12;
    if (method === 'compound') {
      if (isSaving) {
        // 매달 초 납입, k개월 굴림
        var fv = i === 0 ? M * n : M * ((Math.pow(1 + i, n + 1) - (1 + i)) / i);
        return fv - M * n;
      }
      return P * (Math.pow(1 + i, n) - 1);
    }
    if (isSaving) return M * r * n * (n + 1) / 24;   // 1회차가 n개월, 마지막이 1개월
    return P * r * n / 12;
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var isSaving = seg('kind') === 'saving';
    var method = seg('method');
    var taxRate = TAX[seg('tax')];
    var P = (get('principal') || 0) * 10000;
    var M = isSaving ? (get('monthly') || 0) * 10000 : 0;
    if (isSaving && M <= 0) M = P / Math.max(1, get('months'));
    if (!isSaving) M = 0;
    var r = get('rate') / 100;
    var n = Math.round(get('months'));

    var totalIn = isSaving ? M * n + P : P;
    var gross = interest(P, M, r, n, method, isSaving);
    var tax = gross * taxRate;
    var net = gross - tax;
    var maturity = totalIn + net;
    var simpleG = interest(P, M, r, n, 'simple', isSaving);
    var compG = interest(P, M, r, n, 'compound', isSaving);
    var avgIn = isSaving ? M * (n + 1) / 2 : P;   // 평균 예치금
    var effective = avgIn > 0 ? (net / avgIn) * (12 / n) * 100 : 0;

    var rows = [
      { k: '총 납입 원금', v: won(totalIn), note: isSaving ? '월 ' + won(M) + ' × ' + n + '개월' : '거치식' },
      { k: '세전 이자', v: won(gross) },
      { k: (taxRate === 0 ? '세금 (비과세)' : '이자소득세 ' + fmt(taxRate * 100, 1) + '%'), v: '-' + won(tax) },
      { k: '세후 이자', v: won(net), total: false },
      { k: '만기 수령액', v: won(maturity), total: true }
    ];

    var cmp = [];
    ['simple', 'compound'].forEach(function (m2) {
      [0.154, 0].forEach(function (t2) {
        var g = m2 === 'simple' ? simpleG : compG;
        cmp.push([(m2 === 'simple' ? '단리' : '월복리') + (t2 === 0 ? ' · 비과세' : ' · 15.4%'),
                  won(g - g * t2), won(g), won(totalIn + g - g * t2)]);
      });
    });

    var monthsTable = [];
    [6, 12, 24, 36, 60].forEach(function (m3) {
      if (m3 > n) return;
      var g = interest(P, M, r, m3, method, isSaving);
      monthsTable.push([m3 + '개월', won(g), won(g * (1 - taxRate)), won(totalIn * (isSaving ? m3 / n : 1) + g * (1 - taxRate))]);
    });

    return {
      verdict: {
        kicker: '만기 수령액 (세후)', icon: taxRate === 0 ? '🎉' : '🏦',
        title: won(maturity),
        desc: '세전 이자 <b>' + won(gross) + '</b>에서 세금 <b>' + won(tax) + '</b>을 떼고 <b>' + won(net) + '</b>을 받습니다. '
              + '단리 대비 월복리는 <b>' + won(compG - simpleG) + '</b> 차이입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '세후 이자', v: won(net), cls: 'is-good' },
        { l: '세금', v: '-' + won(tax), cls: 'is-bad' },
        { l: '실효 연수익률', v: pct(effective, 2), s: '세후 · 평균 예치금 기준', cls: 'is-accent' },
        { l: '월 이자 환산', v: won(net / n), s: '세후' }
      ],
      rows: rows,
      bars: [
        { l: '납입 원금', v: totalIn, max: maturity, text: wonShort(totalIn), color: 'bar__fill--accent' },
        { l: '세후 이자', v: net, max: maturity, text: wonShort(net), color: 'bar__fill--green' },
        { l: '세금', v: tax, max: maturity, text: wonShort(tax), color: 'bar__fill--kcal' }
      ],
      table: { head: ['구분', '세후 이자', '세전 이자', '만기 수령액'], rows: cmp,
               note: '같은 원금·금리·기간에서 계산 방식과 과세만 바꾼 비교입니다.' },
      notes: [{ html: '<b>단리 vs 월복리</b> — 1년짜리 예금에서는 차이가 거의 없지만(연 3.5%·1,000만원 기준 약 1만원), 3년 이상으로 늘어나면 월복리가 눈에 띄게 유리해집니다. 다만 월복리 상품은 금리가 낮게 책정되는 경우가 많아 <b>표시 금리와 계산 방식을 함께</b> 봐야 합니다.' }]
    };
  }

  WT.mount({
    fields: ["principal", "monthly", "rate", "months"],
    segs: ["kind", "method", "tax"],
    checks: [],
    required: ["rate", "months"],
    presets: {"예금 1,000만 · 3.5% · 1년": {"fields": {"principal": 1000, "monthly": 0, "rate": 3.5, "months": 12}, "segs": {"kind": "deposit", "method": "simple", "tax": "normal"}}, "적금 50만 · 4.2% · 2년": {"fields": {"principal": 0, "monthly": 50, "rate": 4.2, "months": 24}, "segs": {"kind": "saving", "method": "simple", "tax": "normal"}}, "예금 3,000만 · 3.0% · 3년": {"fields": {"principal": 3000, "monthly": 0, "rate": 3.0, "months": 36}, "segs": {"kind": "deposit", "method": "compound", "tax": "normal"}}},
    validate: null,
    compute: compute
  });
})();
