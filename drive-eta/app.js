/* 주행거리·유류비·통행료·도착시간 계산기 — drive-eta/app.js (팩트체크 건강연구소 무료 웹툴) */
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

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var dist = get('dist') || 0;
    var speed = get('speed') || 1;
    var rest = isFinite(get('rest')) ? get('rest') : 0;
    var eff = isFinite(get('eff')) ? get('eff') : 0;
    var fuel = isFinite(get('fuel')) ? get('fuel') : 0;
    var toll = isFinite(get('toll')) ? get('toll') : 0;
    var round = isFinite(get('round')) ? get('round') : 0;
    var mult = round >= 1 ? 2 : 1;

    var driveMin = dist / speed * 60;
    var totalMin = driveMin + rest;
    var startMin = parseTime(val('start') || '09:00');
    var arrive = startMin + totalMin;
    var arriveNext = arrive >= 1440;
    var liters = eff > 0 ? dist * mult / eff : 0;
    var fuelCost = liters * fuel;
    var tollCost = dist * mult * toll;
    var totalCost = fuelCost + tollCost;

    var rows = [
      { k: '이동 거리', v: fmt(dist) + 'km' + (mult === 2 ? ' (왕복 ' + fmt(dist * 2) + 'km)' : '') },
      { k: '순수 주행 시간', v: fmt(Math.floor(driveMin / 60)) + '시간 ' + fmt(Math.round(driveMin % 60)) + '분' },
      { k: '휴식 포함', v: fmt(Math.floor(totalMin / 60)) + '시간 ' + fmt(Math.round(totalMin % 60)) + '분' },
      { k: '출발 시각', v: hhmm(startMin) },
      { k: '도착 예정', v: hhmm(arrive) + (arriveNext ? ' (다음 날)' : ''), total: true },
      { k: '예상 소모 연료', v: fmt(liters, 1) + 'L' },
      { k: '유류비', v: won(fuelCost) },
      { k: '통행료', v: won(tollCost) },
      { k: '총 운행비', v: won(totalCost), total: true },
      { k: 'km당 비용', v: dist * mult > 0 ? won(totalCost / (dist * mult)) : '-' }
    ];

    var table = [50, 70, 90, 110].map(function (sp) {
      var mm = dist / sp * 60 + rest;
      return [sp + 'km/h', fmt(Math.floor(mm / 60)) + '시간 ' + fmt(Math.round(mm % 60)) + '분', hhmm(startMin + mm), won(dist * mult / (eff || 1) * fuel)];
    });

    return {
      verdict: {
        kicker: '도착 예정 시각', icon: '🚗',
        title: hhmm(arrive) + (arriveNext ? ' (익일)' : ''),
        desc: fmt(dist) + 'km를 평균 ' + fmt(speed) + 'km/h로 달리면 <b>' + fmt(Math.floor(totalMin / 60)) + '시간 ' + fmt(Math.round(totalMin % 60)) +
              '분</b>이 걸립니다(휴식 ' + fmt(rest) + '분 포함). ' + hhmm(startMin) + '에 출발하면 <b>' + hhmm(arrive) + '</b> 도착이며, ' +
              '유류비 <b>' + won(fuelCost) + '</b> + 통행료 <b>' + won(tollCost) + '</b> = <b>' + won(totalCost) + '</b>이 듭니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '도착 시각', v: hhmm(arrive), cls: 'is-accent' },
        { l: '소요 시간', v: fmt(Math.round(totalMin / 60 * 10) / 10) + '시간' },
        { l: '유류비', v: won(fuelCost) },
        { l: '총 운행비', v: won(totalCost) }
      ],
      rows: rows,
      table: { head: ['평균 속도', '소요 시간', '도착 시각', '유류비'], rows: table,
               note: '같은 거리에서 평균 속도만 바꾼 값입니다. 속도가 낮을수록 유류비도 줄어듭니다.' },
      notes: [{ html: '<b>휴식은 안전과 직결</b> — 2시간마다 15분 휴식이 권장됩니다. 400km를 4시간 30분에 달리면 최소 2회 휴식이 필요하고, 그만큼 도착이 늦어집니다. 이 계산기에 휴식 시간을 꼭 넣으세요.' }]
    };
  }

  WT.mount({
    fields: ["dist", "speed", "start", "rest", "eff", "fuel", "toll", "round"],
    segs: [],
    checks: [],
    required: ["dist", "speed"],
    presets: {"서울→부산 400km": {"fields": {"dist": 400, "speed": 90, "start": "09:00", "rest": 30, "eff": 12, "fuel": 1650, "toll": 100, "round": 0}}, "서울→강릉 240km": {"fields": {"dist": 240, "speed": 80, "start": "07:30", "rest": 20, "eff": 11, "fuel": 1650, "toll": 100, "round": 0}}, "출퇴근 왕복 40km": {"fields": {"dist": 20, "speed": 35, "start": "08:00", "rest": 0, "eff": 10, "fuel": 1650, "toll": 0, "round": 1}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
