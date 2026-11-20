/* 회의·시간비용 계산기 (참석자 시급으로 환산) — meeting-cost/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var people = Math.max(1, get('people') || 1);
    var minutes = Math.max(1, get('minutes') || 60);
    var salary = get('salary') || 0;
    var prep = isFinite(get('prep')) ? get('prep') : 0;
    var freq = Math.max(1, isFinite(get('freq')) ? get('freq') : 1);
    var over = isFinite(get('overhead')) ? get('overhead') : 1.15;

    var hourly = salary / 209 * over;
    var minutesTotal = minutes + prep;
    var costPerson = hourly * minutesTotal / 60;
    var costOne = costPerson * people;
    var hoursOne = people * minutesTotal / 60;
    var costMonth = costOne * freq;
    var costYear = costMonth * 12;
    var hoursYear = hoursOne * freq * 12;
    var workDays = hoursOne * freq / 8;

    var rows = [
      { k: '참석자 1인 시급 (총인건비 기준)', v: won(hourly), note: '월급 ÷ 209시간 × ' + fmt(over, 2) },
      { k: '1인 소요 시간', v: fmt(minutesTotal) + '분', note: '회의 ' + fmt(minutes) + '분 + 준비 ' + fmt(prep) + '분' },
      { k: '1인당 비용', v: won(costPerson) },
      { k: '참석자 수', v: fmt(people) + '명' },
      { k: '1회 회의 비용', v: won(costOne), total: false },
      { k: '1회 투입 시간', v: fmt(hoursOne) + '시간', note: '8시간 근무일 ' + fmt(workDays, 1) + '일분' },
      { k: '월 비용 (' + fmt(freq) + '회)', v: won(costMonth) },
      { k: '연간 비용', v: won(costYear), total: true },
      { k: '연간 투입 시간', v: fmt(hoursYear) + '시간', note: '근무일 ' + fmt(hoursYear / 8, 1) + '일분' }
    ];

    var table = [3, 5, 8, 10, 15].map(function (p) {
      var c1 = hourly * minutesTotal / 60 * p;
      return [p + '명', won(c1), won(c1 * freq), won(c1 * freq * 12), fmt(p * minutesTotal / 60 * freq * 12) + '시간'];
    });

    return {
      verdict: {
        kicker: '1회 회의 비용', icon: '⏱️',
        title: won(costOne),
        desc: '참석자 ' + fmt(people) + '명이 ' + fmt(minutes) + '분 회의하면(준비 ' + fmt(prep) + '분 포함) <b>' + won(costOne) +
              '</b>의 인건비가 발생합니다. 월 ' + fmt(freq) + '회면 <b>' + won(costMonth) + '</b>, 1년이면 <b>' + won(costYear) +
              '</b>이며, 연간 <b>' + fmt(hoursYear) + '시간</b>을 회의에 쓰는 셈입니다.',
        cls: 'verdict--info'
      },
      stats: [
        { l: '1회 비용', v: won(costOne), cls: 'is-accent' },
        { l: '월 비용', v: won(costMonth) },
        { l: '연간 비용', v: won(costYear) },
        { l: '연간 시간', v: fmt(hoursYear) + '시간', s: '근무일 ' + fmt(hoursYear / 8, 0) + '일' }
      ],
      rows: rows,
      table: { head: ['참석자', '1회 비용', '월 비용', '연간 비용', '연간 시간'], rows: table,
               note: '같은 시간·급여에서 참석자 수만 바꾼 값입니다.' },
      notes: [{ html: '<b>회의를 30분 줄이면</b> — 위 조건에서 1회 ' + won(costOne / 2) + ', 연간 <b>' + won(costYear / 2) + '</b>을 아낍니다. 안건을 3개로 제한하고, 30분 회의를 기본값으로 삼는 것만으로도 비용이 절반이 됩니다.' }]
    };
  }

  WT.mount({
    fields: ["people", "minutes", "salary", "prep", "freq", "overhead"],
    segs: [],
    checks: [],
    required: ["people", "minutes", "salary"],
    presets: {"5명 · 1시간 · 주 1회": {"fields": {"people": 5, "minutes": 60, "salary": 4000000, "prep": 30, "freq": 4, "overhead": 1.15}}, "10명 · 2시간 · 월 1회": {"fields": {"people": 10, "minutes": 120, "salary": 5000000, "prep": 40, "freq": 1, "overhead": 1.15}}, "3명 · 30분 · 매일": {"fields": {"people": 3, "minutes": 30, "salary": 3500000, "prep": 10, "freq": 20, "overhead": 1.15}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
