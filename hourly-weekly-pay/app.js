/* 시급·주휴수당·알바 월급 계산기 (2026 최저임금 반영) — hourly-weekly-pay/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var wage = get('wage') || 0;
    var hours = get('hours') || 0;
    var days = isFinite(get('days')) ? get('days') : 5;
    var weeks = isFinite(get('weeks')) ? get('weeks') : 4.345;
    var mode = seg('ins');

    var eligible = hours >= 15;
    var weekly = eligible ? (hours / 40 * 8) : 0;      // 주휴시간
    var weekPay = hours * wage + weekly * wage;
    var monthPay = hours * wage * weeks;
    var monthWeekly = weekly * wage * weeks;
    var gross = weekPay * weeks;
    var hourlyEq = hours > 0 ? gross / (hours * weeks) : 0;

    var ded = 0, dedLabel = '';
    if (mode === 'four') {
      var ins = gross * 0.0972;
      var tax = gross < 1500000 ? gross * 0.0 : (gross - 1500000) * 0.06;
      ded = ins + tax;
      dedLabel = '4대보험 9.72% + 소득세';
    } else if (mode === 'free') {
      ded = gross * 0.033;
      dedLabel = '3.3% 원천징수';
    } else {
      dedLabel = '공제 없음';
    }
    var net = gross - ded;

    var rows = [
      { k: '시급', v: won(wage) },
      { k: '주 근무시간', v: fmt(hours) + '시간' },
      { k: '주휴시간 (주 15시간 이상)', v: fmt(weekly) + '시간', note: eligible ? '주 ' + fmt(hours) + '시간 ÷ 40 × 8' : '15시간 미만 → 없음' },
      { k: '주급 (주휴 포함)', v: won(weekPay) },
      { k: '월 근로수당', v: won(monthPay) },
      { k: '월 주휴수당', v: won(monthWeekly) },
      { k: '세전 월급', v: won(gross), total: false },
      { k: '공제 (' + dedLabel + ')', v: '-' + won(ded) },
      { k: '실수령액', v: won(net), total: true }
    ];

    var table = [10, 15, 20, 25, 30, 40].map(function (h) {
      var wk = h >= 15 ? h / 40 * 8 : 0;
      var g2 = (h + wk) * wage * weeks;
      return [h + '시간', won(wk * wage * weeks), won(g2), won(g2 * (mode === 'none' ? 1 : 0.97))];
    });

    return {
      verdict: {
        kicker: '세전 월급 (주휴 포함)', icon: '⏰',
        title: won(gross),
        desc: '시급 <b>' + won(wage) + '</b> × 주 ' + fmt(hours) + '시간 × ' + fmt(weeks, 3) + '주 = ' + won(monthPay) +
              ', 여기에 주휴수당 <b>' + won(monthWeekly) + '</b>이 더해집니다. ' +
              (eligible ? '주휴수당 덕분에 실제 시급은 <b>' + won(hourlyEq) + '</b>로 올라갑니다.' : '주 15시간 미만이라 주휴수당이 없습니다.') +
              ' 공제 후 실수령액은 <b>' + won(net) + '</b>입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '세전 월급', v: won(gross), cls: 'is-accent' },
        { l: '주휴수당 (월)', v: won(monthWeekly) },
        { l: '실수령액', v: won(net), cls: 'is-good' },
        { l: '실질 시급', v: won(hourlyEq) }
      ],
      rows: rows,
      bars: [
        { l: '근로수당', v: monthPay, max: gross, text: won(monthPay), color: 'bar__fill--green' },
        { l: '주휴수당', v: monthWeekly, max: gross, text: won(monthWeekly), color: 'bar__fill--accent' },
        { l: '공제', v: ded, max: gross, text: won(ded), color: 'bar__fill--kcal' }
      ],
      table: { head: ['주 근무시간', '월 주휴수당', '세전 월급', '공제 후'], rows: table,
               note: '같은 시급에서 주 근무시간만 바꾼 값입니다. 15시간 경계에서 주휴수당이 생깁니다.' },
      notes: [{ html: '<b>주휴수당 계산법</b> — (주 근무시간 ÷ 40) × 8시간 × 시급입니다. 주 40시간이면 8시간분, 주 20시간이면 4시간분이 붙습니다. 주 15시간 이상이면서 그 주에 개근해야 하며, 지각·조퇴가 있어도 사업장 규정에 따라 인정될 수 있습니다.' }]
    };
  }

  WT.mount({
    fields: ["wage", "hours", "days", "weeks"],
    segs: ["ins"],
    checks: [],
    required: ["wage", "hours"],
    presets: {"주 20시간 · 최저임금": {"fields": {"wage": 10320, "hours": 20, "days": 5, "weeks": 4.345}, "segs": {"ins": "four"}}, "주 40시간 · 시급 1만 2천": {"fields": {"wage": 12000, "hours": 40, "days": 5, "weeks": 4.345}, "segs": {"ins": "four"}}, "주 10시간 (주휴 없음)": {"fields": {"wage": 11000, "hours": 10, "days": 2, "weeks": 4.345}, "segs": {"ins": "free"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
