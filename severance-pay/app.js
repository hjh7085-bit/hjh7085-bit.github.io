/* 퇴직금·실업급여 계산기 (2026 상한 68,100원 반영) — severance-pay/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function sevTax(sev, years) {           // 퇴직소득세 근사
    if (sev <= 0 || years <= 0) return 0;
    var yDed;
    if (years <= 5) yDed = 1000000 * years;
    else if (years <= 10) yDed = 5000000 + (years - 5) * 2000000;
    else if (years <= 20) yDed = 15000000 + (years - 10) * 2500000;
    else yDed = 40000000 + (years - 20) * 3000000;
    var converted = Math.max(0, (sev - yDed) * 12 / years);   // 환산급여
    var cDed;
    if (converted <= 8000000) cDed = converted;
    else if (converted <= 70000000) cDed = 8000000 + (converted - 8000000) * 0.6;
    else if (converted <= 100000000) cDed = 45200000 + (converted - 70000000) * 0.55;
    else if (converted <= 300000000) cDed = 61700000 + (converted - 100000000) * 0.45;
    else cDed = 151700000 + (converted - 300000000) * 0.35;
    var base = Math.max(0, converted - cDed);
    var taxRate, prog;
    if (base <= 14000000) { taxRate = 0.06; prog = 0; }
    else if (base <= 50000000) { taxRate = 0.15; prog = 1260000; }
    else if (base <= 88000000) { taxRate = 0.24; prog = 5760000; }
    else if (base <= 150000000) { taxRate = 0.35; prog = 15440000; }
    else { taxRate = 0.38; prog = 19940000; }
    var convertedTax = Math.max(0, base * taxRate - prog);
    return convertedTax * years / 12;
  }
  function benefitDays(years, age) {
    var senior = age >= 50;
    if (years < 1) return 0;
    if (years < 3) return senior ? 180 : 150;
    if (years < 5) return senior ? 210 : 180;
    if (years < 10) return senior ? 240 : 210;
    return senior ? 270 : 240;
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var salary = get('salary') * 10000;
    var bonus = (get('bonus') || 0) * 10000;
    var years = Math.round(get('years') || 0);
    var months = Math.round(get('months') || 0);
    var age = Math.round(get('age') || 30);
    var hours = Math.round(get('hours') || 8);
    var days = years * 365 + months * 30;
    var totalYears = days / 365;
    var invol = seg('reason') === 'invol';

    var threeMonthPay = salary * 3 + bonus * 3 / 12;
    var dailyWage = threeMonthPay / 91;                 // 3개월 91일 기준
    var sev = totalYears >= 1 ? dailyWage * 30 * (days / 365) : 0;
    var tax = sevTax(sev, totalYears);
    var local = tax * 0.1;
    var sevNet = sev - tax - local;

    var rawDaily = dailyWage * 0.6 * (hours / 8);
    var lo = 10320 * 0.8 * hours, hi = 68100 * (hours / 8);
    var dailyBenefit = totalYears >= 1 && invol ? Math.min(Math.max(rawDaily, lo), hi) : 0;
    var bDays = invol ? benefitDays(totalYears, age) : 0;
    var totalBenefit = dailyBenefit * bDays;

    var rows = [
      { k: '재직일수', v: fmt(days) + '일', note: fmt(totalYears, 1) + '년' },
      { k: '1일 평균임금', v: won(dailyWage), note: '최근 3개월 임금총액 ÷ 91일' },
      { k: '퇴직금 (세전)', v: won(sev), total: false },
      { k: '퇴직소득세', v: '-' + won(tax) },
      { k: '지방소득세 (10%)', v: '-' + won(local) },
      { k: '퇴직금 (세후)', v: won(sevNet), total: true },
      { k: '실업급여 1일액', v: won(dailyBenefit), note: '평균임금 60% · 상하한 적용' },
      { k: '수급일수', v: bDays + '일' },
      { k: '실업급여 총액', v: won(totalBenefit), total: true }
    ];

    var tiers = [
      ['1년 미만', '120일', '—'],
      ['1~3년', '150일', '180일'],
      ['3~5년', '180일', '210일'],
      ['5~10년', '210일', '240일'],
      ['10년 이상', '240일', '270일']
    ].map(function (t) { return t; });

    return {
      verdict: {
        kicker: '퇴직금 (세후) + 실업급여', icon: '📄',
        title: won(sevNet + totalBenefit),
        desc: '퇴직금 세후 <b>' + won(sevNet) + '</b> + 실업급여 <b>' + won(totalBenefit) + '</b>(' + bDays + '일분)입니다. '
              + (totalYears < 1
                  ? '재직 1년 미만이라 법정 퇴직금이 없습니다(1년 이상 근무 시 발생).'
                  : '퇴직소득세·지방소득세로 <b>' + won(tax + local) + '</b>을 냅니다.'),
        cls: totalYears >= 1 ? 'verdict--ok' : 'verdict--warn'
      },
      stats: [
        { l: '퇴직금 (세전)', v: wonShort(sev) },
        { l: '퇴직금 (세후)', v: wonShort(sevNet), cls: 'is-good' },
        { l: '실업급여 1일', v: won(dailyBenefit) },
        { l: '실업급여 총액', v: wonShort(totalBenefit), cls: 'is-accent' }
      ],
      rows: rows,
      bars: [
        { l: '퇴직금 (세후)', v: sevNet, max: Math.max(sevNet + totalBenefit, 1), text: wonShort(sevNet), color: 'bar__fill--accent' },
        { l: '실업급여', v: totalBenefit, max: Math.max(sevNet + totalBenefit, 1), text: wonShort(totalBenefit), color: 'bar__fill--green' }
      ],
      table: { head: ['고용보험 가입기간', '50세 미만', '50세 이상·장애인'], rows: tiers,
               note: '2026년 기준 수급일수. 가입기간 1년 미만은 120일이지만 180일 이상 가입 요건을 함께 충족해야 합니다.' },
      notes: [
        { html: '<b>퇴직금은 1년 이상</b> 근무해야 발생합니다. 1년 미만이면 법정 퇴직금이 없고, 수습기간도 근로계약상 근무라면 재직기간에 포함됩니다.' },
        { html: '실업급여는 <b>비자발적 이직</b>이 원칙입니다. 권고사직·계약만료·정리해고는 해당되고, 자발적 퇴사는 임금체불·성희롱·건강악화 등 정당한 사유가 있어야 인정됩니다. 이직확인서의 이직 사유 코드가 핵심입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["salary", "bonus", "years", "months", "age", "hours"],
    segs: ["reason"],
    checks: [],
    required: ["salary", "years"],
    presets: {"5년 근무 · 월 350만": {"fields": {"salary": 350, "bonus": 400, "years": 5, "months": 7, "age": 34, "hours": 8}, "segs": {"reason": "invol"}}, "10년 근무 · 월 500만": {"fields": {"salary": 500, "bonus": 800, "years": 10, "months": 0, "age": 52, "hours": 8}, "segs": {"reason": "invol"}}, "2년 근무 · 월 280만": {"fields": {"salary": 280, "bonus": 200, "years": 2, "months": 3, "age": 29, "hours": 8}, "segs": {"reason": "invol"}}},
    validate: null,
    compute: compute
  });
})();
