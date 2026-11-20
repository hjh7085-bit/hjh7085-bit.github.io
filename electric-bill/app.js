/* 전기요금 누진제 계산기 (주택용 저압 · 가전 전기세) — electric-bill/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var BASE = [910, 1600, 7300];
  var RATE = [120, 214.6, 307.3];
  var CLIMATE = 9;      // 원/kWh
  var FUND = 0.037;     // 전력산업기반기금
  var VAT = 0.1;

  function bill(kwh, season, fuelAdj) {
    var t1 = season === 'summer' ? 300 : 200;
    var t2 = season === 'summer' ? 450 : 400;
    var tier = kwh <= t1 ? 0 : kwh <= t2 ? 1 : 2;
    var baseFee = BASE[tier];
    var energy = 0;
    var k1 = Math.min(kwh, t1);
    energy += k1 * RATE[0];
    if (kwh > t1) energy += (Math.min(kwh, t2) - t1) * RATE[1];
    if (kwh > t2) energy += (kwh - t2) * RATE[2];
    var climate = kwh * CLIMATE;
    var fuel = kwh * (fuelAdj || 0);
    var sub = baseFee + energy + climate + fuel;
    var vat = sub * VAT;
    var fund = sub * FUND;
    return { tier: tier, t1: t1, t2: t2, baseFee: baseFee, energy: energy, climate: climate,
             fuel: fuel, sub: sub, vat: vat, fund: fund, total: sub + vat + fund };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var kwh = get('kwh') || 0;
    var season = seg('season');
    var fuelAdj = isFinite(get('fuel')) ? get('fuel') : 0;
    var watt = isFinite(get('watt')) ? get('watt') : 0;
    var hours = isFinite(get('hours')) ? get('hours') : 0;
    var count = isFinite(get('count')) ? get('count') : 1;
    var days = isFinite(get('days')) ? get('days') : 30;

    var b = bill(kwh, season, fuelAdj);
    var addKwh = watt * hours * count * days / 1000;
    var b2 = bill(kwh + addKwh, season, fuelAdj);
    var addCost = b2.total - b.total;
    var marginal = addKwh > 0 ? addCost / addKwh : 0;

    var rows = [
      { k: '월 사용량', v: fmt(kwh) + 'kWh', note: season === 'summer' ? '여름 구간(300/450kWh)' : '일반 구간(200/400kWh)' },
      { k: '누진 단계', v: (b.tier + 1) + '단계' },
      { k: '기본요금', v: won(b.baseFee) },
      { k: '전력량요금', v: won(b.energy) },
      { k: '기후환경요금 (9원/kWh)', v: won(b.climate) }
    ];
    if (b.fuel !== 0) rows.push({ k: '연료비조정요금', v: won(b.fuel) });
    rows.push({ k: '소계', v: won(b.sub) });
    rows.push({ k: '부가가치세 (10%)', v: won(b.vat) });
    rows.push({ k: '전력산업기반기금 (3.7%)', v: won(b.fund) });
    rows.push({ k: '청구요금', v: won(b.total), total: true });
    if (addKwh > 0) {
      rows.push({ k: '가전 추가 사용량', v: fmt(addKwh, 1) + 'kWh', note: fmt(watt) + 'W × ' + fmt(hours) + 'h × ' + fmt(count) + '대 × ' + fmt(days) + '일' });
      rows.push({ k: '가전 추가 요금', v: '+' + won(addCost), note: 'kWh당 ' + won(marginal) });
      rows.push({ k: '가전 포함 총 요금', v: won(b2.total), total: true });
    }

    var table = [150, 200, 300, 400, 500, 700].map(function (k) {
      var x = bill(k, season, fuelAdj);
      return [fmt(k) + 'kWh', (x.tier + 1) + '단계', won(x.energy), won(x.total), won(x.total / k) + '/kWh'];
    });

    return {
      verdict: {
        kicker: '예상 청구요금', icon: '⚡',
        title: won(b2.total),
        desc: fmt(kwh) + 'kWh 사용 시 <b>' + (b.tier + 1) + '단계</b>가 적용되어 ' + won(b.total) + '입니다. ' +
              (addKwh > 0 ? '가전을 추가로 쓰면 ' + fmt(addKwh, 1) + 'kWh가 늘어 <b>' + won(addCost) + '</b>이 더 나옵니다(kWh당 ' + won(marginal) + ').' : '') +
              ' kWh당 평균 ' + won(b.total / Math.max(1, kwh)) + '입니다.',
        cls: b.tier === 2 ? 'verdict--warn' : 'verdict--ok'
      },
      stats: [
        { l: '청구요금', v: won(b.total), cls: 'is-accent' },
        { l: '누진 단계', v: (b.tier + 1) + '단계' },
        { l: 'kWh당', v: won(b.total / Math.max(1, kwh)) },
        { l: '가전 추가', v: addKwh > 0 ? '+' + won(addCost) : '-' }
      ],
      rows: rows,
      bars: [
        { l: '기본요금', v: b.baseFee, max: b.total, text: won(b.baseFee), color: 'bar__fill--prot' },
        { l: '전력량요금', v: b.energy, max: b.total, text: won(b.energy), color: 'bar__fill--green' },
        { l: '기후·연료', v: b.climate + b.fuel, max: b.total, text: won(b.climate + b.fuel), color: 'bar__fill--accent' },
        { l: '세금·기금', v: b.vat + b.fund, max: b.total, text: won(b.vat + b.fund), color: 'bar__fill--kcal' }
      ],
      table: { head: ['사용량', '단계', '전력량요금', '총 요금', 'kWh당'], rows: table,
               note: '같은 조건에서 사용량만 바꾼 값입니다. 구간을 넘길 때 요금이 크게 뜁니다.' },
      notes: [{ html: '<b>누진제의 함정</b> — 400kWh에서 1kWh만 넘겨도 기본요금이 1,600원에서 7,300원으로 5,700원 뛰고, 넘긴 1kWh에는 3단계 단가 307.3원이 적용됩니다. 사용량 전체가 3단계 단가로 바뀌지는 않지만, 기본요금 인상이 커서 체감 부담이 큽니다.' }]
    };
  }

  WT.mount({
    fields: ["kwh", "fuel", "watt", "hours", "count", "days"],
    segs: ["season"],
    checks: [],
    required: ["kwh"],
    presets: {"350kWh (2단계)": {"fields": {"kwh": 350, "fuel": 0, "watt": 1500, "hours": 2, "count": 1, "days": 30}, "segs": {"season": "normal"}}, "220kWh (1단계)": {"fields": {"kwh": 220, "fuel": 0, "watt": 2000, "hours": 1, "count": 1, "days": 20}, "segs": {"season": "normal"}}, "500kWh (3단계)": {"fields": {"kwh": 500, "fuel": 0, "watt": 1500, "hours": 3, "count": 2, "days": 30}, "segs": {"season": "summer"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
