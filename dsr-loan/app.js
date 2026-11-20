/* DSR·DTI 대출한도 추정기 (스트레스 금리 반영) — dsr-loan/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function annualRepay(P, rate, years, way) {
    var n = years * 12, i = rate / 100 / 12;
    if (way === 'interest') return P * i * 12;
    if (way === 'principal') {
      var first = P / n + P * i;
      var last = P / n + (P / n) * i;
      return (first + last) / 2 * 12;
    }
    if (i === 0) return P / years;
    var m = P * i / (1 - Math.pow(1 + i, -n));
    return m * 12;
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var income = (get('income') || 0) * 10000;
    var old = (isFinite(get('old')) ? get('old') : 0) * 10000;
    var rate = get('rate') || 0;
    var years = get('years') || 30;
    var way = seg('way');
    var add = seg('stress') === 'capital' ? 1.5 : seg('stress') === 'local' ? 0.75 : 0;
    var capRate = seg('cap') === '40' ? 0.40 : seg('cap') === '45' ? 0.45 : 0.50;
    var stressRate = rate + add;

    var allowed = income * capRate - old;
    var loan = 0, monthly = 0;
    if (allowed > 0 && income > 0) {
      // 이분법으로 원금 탐색
      var lo = 0, hi = income * capRate * 40 + 100000000;
      for (var k = 0; k < 60; k++) {
        var mid = (lo + hi) / 2;
        if (annualRepay(mid, stressRate, years, way) <= allowed) lo = mid; else hi = mid;
      }
      loan = lo;
      monthly = annualRepay(loan, rate, years, way) / 12;
    }
    var stressMonthly = annualRepay(loan, stressRate, years, way) / 12;
    var dsr = income > 0 ? (annualRepay(loan, stressRate, years, way) + old) / income * 100 : 0;

    var rows = [
      { k: '연소득', v: won(income) },
      { k: '기존 대출 연 원리금', v: won(old) },
      { k: 'DSR 한도 (' + fmt(capRate * 100) + '%)', v: won(income * capRate) },
      { k: '신규 대출에 쓸 수 있는 원리금', v: won(Math.max(0, allowed)), note: '연 기준' },
      { k: '적용 금리 (스트레스 +' + fmt(add, 2) + '%p)', v: pct(stressRate, 2) },
      { k: '추정 대출한도', v: won(loan), total: true },
      { k: '월 상환액 (실제 금리)', v: won(monthly) },
      { k: '월 상환액 (심사 금리)', v: won(stressMonthly), note: '은행 심사 기준' },
      { k: '산출 DSR', v: pct(dsr, 1) }
    ];

    var table = [20, 30, 40].map(function (y) {
      var lo2 = 0, hi2 = income * capRate * 40 + 100000000;
      var allow = income * capRate - old;
      for (var k2 = 0; k2 < 60; k2++) {
        var mid2 = (lo2 + hi2) / 2;
        if (annualRepay(mid2, stressRate, y, way) <= allow) lo2 = mid2; else hi2 = mid2;
      }
      return [y + '년', won(lo2), won(annualRepay(lo2, rate, y, way) / 12)];
    });

    return {
      verdict: {
        kicker: 'DSR ' + fmt(capRate * 100) + '% 기준 추정 한도', icon: '🏦',
        title: won(loan),
        desc: '연소득 <b>' + won(income) + '</b>의 ' + fmt(capRate * 100) + '%(' + won(income * capRate) + ')에서 기존 대출 ' + won(old) +
              '을 뺀 금액으로, <b>' + fmt(years) + '년 ' + (way === 'equal' ? '원리금균등' : way === 'principal' ? '원금균등' : '만기일시') +
              '</b> 상환 시 빌릴 수 있는 금액입니다. 실제 금리 ' + pct(rate, 2) + '%로 월 <b>' + won(monthly) + '</b>을 갚게 됩니다.',
        cls: loan > 0 ? 'verdict--info' : 'verdict--warn'
      },
      stats: [
        { l: '추정 한도', v: wonShort(loan), cls: 'is-accent' },
        { l: '월 상환액', v: won(monthly) },
        { l: '심사 월 상환액', v: won(stressMonthly), s: '스트레스 +' + fmt(add, 2) + '%p' },
        { l: 'DSR', v: pct(dsr, 1) }
      ],
      rows: rows,
      table: { head: ['기간', '한도', '월 상환액'], rows: table, note: '같은 조건에서 기간만 바꾼 값입니다. 기간이 길수록 한도는 늘고 총이자는 늘어납니다.' },
      notes: [{ html: '<b>만기일시는 한도가 가장 낮습니다</b> — 이자만 갚는 방식은 DSR 산정에서 원금까지 나눠 계산하기 때문에, 같은 소득으로 빌릴 수 있는 금액이 크게 줄어듭니다. 반대로 기간을 40년으로 늘리면 월 상환액이 줄어 한도는 늘지만, 총이자는 30년 대비 수천만원 늘어납니다.' }]
    };
  }

  WT.mount({
    fields: ["income", "old", "rate", "years"],
    segs: ["way", "stress", "cap"],
    checks: [],
    required: ["income", "rate", "years"],
    presets: {"연봉 5,000 · 30년": {"fields": {"income": 5000, "old": 600, "rate": 4.2, "years": 30}, "segs": {"way": "equal", "stress": "capital", "cap": "40"}}, "연봉 8,000 · 40년": {"fields": {"income": 8000, "old": 1200, "rate": 3.9, "years": 40}, "segs": {"way": "equal", "stress": "capital", "cap": "40"}}, "맞벌이 1억 2천 · 30년": {"fields": {"income": 12000, "old": 2000, "rate": 4.5, "years": 30}, "segs": {"way": "principal", "stress": "capital", "cap": "40"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
