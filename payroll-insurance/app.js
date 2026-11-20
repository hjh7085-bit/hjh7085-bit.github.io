/* 4대보험 사업주·근로자 부담금 계산기 (2026 요율) — payroll-insurance/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var P_MIN = 410000, P_MAX = 6590000;
  function floor10(n) { return Math.floor(n / 10) * 10; }

  function calc(pay, sanjaeRate, stabilityRate) {
    var pensionBase = Math.min(Math.max(pay, P_MIN), P_MAX);
    var penW = floor10(pensionBase * 0.0475);
    var penE = floor10(pensionBase * 0.0475);
    var healthW = floor10(pay * 0.03595);
    var healthE = floor10(pay * 0.03595);
    var careW = floor10(healthW * 0.1314);
    var careE = floor10(healthE * 0.1314);
    var empW = floor10(pay * 0.009);
    var empE = floor10(pay * 0.009 + pay * stabilityRate / 100);
    var sanjae = floor10(pay * sanjaeRate / 100);
    var wSum = penW + healthW + careW + empW;
    var eSum = penE + healthE + careE + empE + sanjae;
    return { penW: penW, penE: penE, healthW: healthW, healthE: healthE, careW: careW, careE: careE,
             empW: empW, empE: empE, sanjae: sanjae, wSum: wSum, eSum: eSum, pensionBase: pensionBase };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var pay = get('pay') || 0;
    var workers = isFinite(get('workers')) ? get('workers') : 1;
    var sanjae = isFinite(get('sanjae')) ? get('sanjae') : 1.4;
    var stab = isFinite(get('stability')) ? get('stability') : 0.25;
    var c = calc(pay, sanjae, stab);

    var rows = [
      { k: '월 급여', v: won(pay) },
      { k: '국민연금 (근로자 4.75%)', v: won(c.penW), note: '사업주 동일 4.75%' },
      { k: '건강보험 (근로자 3.595%)', v: won(c.healthW) },
      { k: '장기요양 (건강보험의 13.14%)', v: won(c.careW) },
      { k: '고용보험 (근로자 0.9%)', v: won(c.empW) },
      { k: '근로자 부담 합계', v: won(c.wSum), note: pct(pay > 0 ? c.wSum / pay * 100 : 0, 2) },
      { k: '사업주 국민연금 4.75%', v: won(c.penE) },
      { k: '사업주 건강보험 3.595%', v: won(c.healthE) },
      { k: '사업주 장기요양 0.4724%', v: won(c.careE) },
      { k: '사업주 고용보험 (0.9+' + fmt(stab, 2) + '%)', v: won(c.empE) },
      { k: '사업주 산재보험 (' + fmt(sanjae, 2) + '%)', v: won(c.sanjae) },
      { k: '사업주 부담 합계', v: won(c.eSum), note: pct(pay > 0 ? c.eSum / pay * 100 : 0, 2) },
      { k: '직원 1명 총 인건비', v: won(pay + c.eSum), total: true }
    ];

    var table = [2000000, 2500000, 3000000, 4000000, 5000000, 7000000].map(function (p) {
      var x = calc(p, sanjae, stab);
      return [fmt(p / 10000) + '만', won(x.wSum), won(x.eSum), won(p + x.eSum), pct(x.wSum / p * 100, 2)];
    });

    return {
      verdict: {
        kicker: '사업주 부담 (직원 1명)', icon: '🏢',
        title: won(c.eSum),
        desc: '월급 <b>' + won(pay) + '</b> 기준으로 사업주는 보험료 <b>' + won(c.eSum) + '</b>(급여의 ' + pct(c.eSum / pay * 100, 1) +
              ')를 더 부담합니다. 근로자 몫은 <b>' + won(c.wSum) + '</b>이고, 직원 1명의 실제 회사 비용은 <b>' + won(pay + c.eSum) + '</b>입니다. ' +
              '직원 ' + fmt(workers) + '명이면 월 ' + won((pay + c.eSum) * workers) + '입니다.',
        cls: 'verdict--info'
      },
      stats: [
        { l: '근로자 부담', v: won(c.wSum), s: pct(pay > 0 ? c.wSum / pay * 100 : 0, 2) },
        { l: '사업주 부담', v: won(c.eSum), s: pct(pay > 0 ? c.eSum / pay * 100 : 0, 2), cls: 'is-accent' },
        { l: '총 인건비', v: won(pay + c.eSum) },
        { l: '직원 수', v: fmt(workers) + '명' }
      ],
      rows: rows,
      table: { head: ['월 급여', '근로자', '사업주', '총 인건비', '근로자 부담률'], rows: table,
               note: '같은 요율·업종에서 급여만 바꾼 값입니다. 국민연금은 659만원 상한이 적용됩니다.' },
      notes: [{ html: '<b>국민연금 상한</b> — 기준소득월액이 659만원을 넘으면 보험료가 더 늘지 않습니다. 반대로 41만원 미만이면 하한이 적용됩니다. 이 상·하한은 매년 7월에 바뀝니다.' }]
    };
  }

  WT.mount({
    fields: ["pay", "workers", "sanjae", "stability"],
    segs: [],
    checks: [],
    required: ["pay"],
    presets: {"월급 250만": {"fields": {"pay": 2500000, "workers": 1, "sanjae": 1.4, "stability": 0.25}}, "월급 300만": {"fields": {"pay": 3000000, "workers": 1, "sanjae": 1.4, "stability": 0.25}}, "월급 500만": {"fields": {"pay": 5000000, "workers": 1, "sanjae": 1.4, "stability": 0.25}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
