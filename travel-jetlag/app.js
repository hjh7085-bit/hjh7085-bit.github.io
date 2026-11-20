/* 해외여행 시차·도착시각·팁 계산기 — travel-jetlag/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function parseTime(s) {
    var m = String(s || '').match(/^(\d{1,2})[:.]?(\d{2})?$/);
    if (!m) return 9 * 60;
    var h = parseInt(m[1], 10), mi = m[2] ? parseInt(m[2], 10) : 0;
    if (!isFinite(h) || h > 23) h = 9;
    if (!isFinite(mi) || mi > 59) mi = 0;
    return h * 60 + mi;
  }
  function hhmm(mins) {
    var m = ((mins % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mi = Math.round(m % 60);
    return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  }
  var DAY = ['일', '월', '화', '수', '목', '금', '토'];

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var fo = get('fromOffset') || 0, to = get('toOffset') || 0;
    var flight = isFinite(get('flight')) ? get('flight') : 0;
    var depart = parseTime(val('depart') || '09:00');
    var bill = isFinite(get('bill')) ? get('bill') : 0;
    var tipRate = isFinite(get('tipRate')) ? get('tipRate') : 0;

    var diff = to - fo;
    var arriveLocal = depart + flight * 60 + diff * 60;
    var daysShift = Math.floor(arriveLocal / 1440);
    var arriveClock = hhmm(arriveLocal);
    var jetlag = Math.abs(diff);
    var adaptDays = Math.ceil(jetlag / 1.0 * 0.6);
    var tip = bill * tipRate / 100;
    var totalBill = bill + tip;
    var perPerson3 = totalBill / 3;

    var rows = [
      { k: '출발지 시차 (UTC' + (fo >= 0 ? '+' : '') + fmt(fo) + ')', v: hhmm(depart) + ' 출발' },
      { k: '도착지 시차 (UTC' + (to >= 0 ? '+' : '') + fmt(to) + ')', v: hhmm(depart) + ' 출발' },
      { k: '시차', v: (diff >= 0 ? '+' : '') + fmt(diff) + '시간', note: diff > 0 ? '동쪽으로 이동(시계 앞으로)' : diff < 0 ? '서쪽으로 이동(시계 뒤로)' : '시차 없음' },
      { k: '비행시간', v: fmt(flight) + '시간' },
      { k: '현지 도착 시각', v: arriveClock + (daysShift > 0 ? ' (+' + daysShift + '일)' : daysShift < 0 ? ' (' + daysShift + '일)' : ''), total: true },
      { k: '제트랙 적응 (권장)', v: fmt(adaptDays) + '일', note: '하루 1시간씩 적응' },
      { k: '식사 금액', v: fmt(bill, 2) },
      { k: '팁 (' + fmt(tipRate) + '%)', v: fmt(tip, 2) },
      { k: '총 결제액', v: fmt(totalBill, 2), total: true },
      { k: '3인 분담 시 1인', v: fmt(perPerson3, 2) }
    ];

    var table = [[9, 9, '도쿄'], [9, 7, '방콕'], [9, 4, '두바이'], [9, 1, '파리'], [9, 0, '런던'], [9, -5, '뉴욕'], [9, -8, 'LA']].map(function (c) {
      var arr = depart + flight * 60 + (c[1] - c[0]) * 60;
      return [c[2], (c[1] - c[0] >= 0 ? '+' : '') + (c[1] - c[0]) + '시간', hhmm(arr), fmt(Math.ceil(Math.abs(c[1] - c[0]) * 0.6)) + '일'];
    });

    return {
      verdict: {
        kicker: '현지 도착 시각', icon: '✈️',
        title: arriveClock + (daysShift > 0 ? ' (+' + daysShift + '일)' : ''),
        desc: '시차 <b>' + (diff >= 0 ? '+' : '') + fmt(diff) + '시간</b>, 비행 ' + fmt(flight) + '시간이면 현지 시각 <b>' + arriveClock + '</b>에 도착합니다. ' +
              '시차 ' + fmt(jetlag) + '시간은 <b>' + fmt(adaptDays) + '일</b> 정도 적응이 필요합니다. ' +
              (bill > 0 ? '식사 ' + fmt(bill, 2) + '에 ' + fmt(tipRate) + '% 팁이면 <b>' + fmt(totalBill, 2) + '</b>을 결제합니다.' : ''),
        cls: 'verdict--ok'
      },
      stats: [
        { l: '시차', v: (diff >= 0 ? '+' : '') + fmt(diff) + '시간', cls: 'is-accent' },
        { l: '현지 도착', v: arriveClock },
        { l: '제트랙 적응', v: fmt(adaptDays) + '일' },
        { l: '팁 포함', v: fmt(totalBill, 2) }
      ],
      rows: rows,
      table: { head: ['도시', '시차', '도착 시각', '적응'], rows: table,
               note: '서울 출발·같은 비행시간 기준 도시별 도착 시각입니다(서머타임 미반영).' },
      notes: [{ html: '<b>제트랙 줄이는 법</b> — 동쪽으로 갈수록 시차 적응이 어렵습니다. 도착 당일 햇빛을 2시간 이상 쬐고, 현지 취침 시간에 맞춰 자는 것이 핵심입니다. 비행기에서 미리 현지 시간으로 식사·수면을 조정하면 하루 정도 단축됩니다.' }]
    };
  }

  WT.mount({
    fields: ["fromOffset", "toOffset", "depart", "flight", "bill", "tipRate"],
    segs: [],
    checks: [],
    required: ["fromOffset", "toOffset", "flight"],
    presets: {"서울→뉴욕 14시간": {"fields": {"fromOffset": 9, "toOffset": -5, "depart": "09:00", "flight": 14, "bill": 80, "tipRate": 18}}, "서울→파리 12시간": {"fields": {"fromOffset": 9, "toOffset": 1, "depart": "13:00", "flight": 12, "bill": 60, "tipRate": 10}}, "서울→방콕 5시간": {"fields": {"fromOffset": 9, "toOffset": 7, "depart": "19:00", "flight": 5, "bill": 500, "tipRate": 5}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
