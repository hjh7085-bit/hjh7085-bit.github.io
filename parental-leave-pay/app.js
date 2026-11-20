/* 육아휴직 급여 계산기 (2026 월별 상한 · 6+6 특례) — parental-leave-pay/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var CAP1 = 2500000, CAP2 = 2000000, CAP3 = 1600000;
  var CAP6_1 = 2000000, CAP6_2 = 2500000, CAP6_3 = 3000000;

  function monthly(wage, m, six) {
    var cap = 0, rate = 0;
    if (m <= 3) {
      rate = 1.0;
      cap = six ? CAP6_1 : CAP1;
    } else if (m <= 6) {
      rate = 0.8;
      cap = six ? CAP6_2 : CAP2;
    } else {
      rate = 0.5;
      cap = six ? CAP6_3 : CAP3;
    }
    var raw = wage * rate;
    var pay = Math.min(raw, cap);
    return { raw: raw, pay: pay, rate: rate, cap: cap, capped: raw > cap };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var wage = get('wage') || 0;
    var months = Math.max(1, Math.min(24, Math.round(get('months') || 12)));
    var six = seg('six') === 'yes';

    var rows = [], total = 0, totalNet = 0;
    var list = [];
    for (var m = 1; m <= months; m++) {
      var x = monthly(wage, m, six);
      total += x.pay;
      totalNet += x.pay * 0.75;
      list.push({ m: m, pay: x.pay, rate: x.rate, cap: x.cap, capped: x.capped });
      if (m === 1 || m === 4 || m === 7 || m === months) {
        rows.push({ k: m + '개월차 (' + fmt(x.rate * 100) + '%, 상한 ' + wonShort(x.cap) + ')', v: won(x.pay), note: '사후지급 25% 차감 시 ' + won(x.pay * 0.75) });
      }
    }
    rows.push({ k: '총 급여 (사후지급 포함)', v: won(total) });
    rows.push({ k: '휴직 중 수령액 (75%)', v: won(totalNet) });
    rows.push({ k: '복직 후 받는 사후지급금 (25%)', v: won(total * 0.25), total: true });

    var table = [];
    [1, 2, 3, 4, 5, 6, 9, 12].forEach(function (m) {
      if (m > months) return;
      var x = monthly(wage, m, six);
      table.push([m + '개월차', fmt(x.rate * 100) + '%', won(x.cap), won(x.pay)]);
    });

    var first = monthly(wage, 1, six);
    return {
      verdict: {
        kicker: '월별 급여 (1~3개월)', icon: '🍼',
        title: won(first.pay) + ' / 월',
        desc: '통상임금 <b>' + won(wage) + '</b>의 ' + fmt(first.rate * 100) + '%에 해당하는 ' + won(first.raw) + '에서 상한 ' + won(first.cap) +
              '을 적용해 월 <b>' + won(first.pay) + '</b>입니다. ' + fmt(months) + '개월 총액은 <b>' + won(total) + '</b>이고, ' +
              '그중 <b>' + won(total * 0.25) + '</b>은 복직 후 6개월 근무해야 받습니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '1~3개월', v: won(first.pay) + '/월', s: '100%' },
        { l: '4~6개월', v: won(monthly(wage, 4, six).pay) + '/월', s: '80%' },
        { l: '7개월~', v: won(monthly(wage, 7, six).pay) + '/월', s: '50%' },
        { l: '총액', v: wonShort(total), cls: 'is-accent', s: fmt(months) + '개월' }
      ],
      rows: rows,
      bars: [
        { l: '1~3개월', v: first.pay, max: Math.max(first.raw, first.pay), text: won(first.pay), color: 'bar__fill--green' },
        { l: '4~6개월', v: monthly(wage, 4, six).pay, max: Math.max(first.raw, first.pay), text: won(monthly(wage, 4, six).pay), color: 'bar__fill--accent' },
        { l: '7개월~', v: monthly(wage, 7, six).pay, max: Math.max(first.raw, first.pay), text: won(monthly(wage, 7, six).pay), color: 'bar__fill--kcal' }
      ],
      table: { head: ['시점', '지급률', '월 상한', '지급액'], rows: table,
               note: six ? '6+6 특례 적용(첫 6개월 상한 200만→250만→300만원).' : '일반 육아휴직 기준입니다.' },
      notes: [{ html: '<b>사후지급금 25%</b> — 육아휴직 급여의 25%는 복직 후 6개월 이상 계속 근무해야 지급됩니다. 휴직 중 통장에 들어오는 돈은 표의 75%이므로, 생활비 계획은 그 기준으로 세우세요.' }]
    };
  }

  WT.mount({
    fields: ["wage", "months"],
    segs: ["six"],
    checks: [],
    required: ["wage", "months"],
    presets: {"통상임금 300만 · 12개월": {"fields": {"wage": 3000000, "months": 12}, "segs": {"six": "no"}}, "통상임금 200만 · 12개월": {"fields": {"wage": 2000000, "months": 12}, "segs": {"six": "no"}}, "통상임금 120만 · 6+6": {"fields": {"wage": 1200000, "months": 12}, "segs": {"six": "yes"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
