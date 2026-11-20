/* 유류비·연비·충전비 주행 비용 계산기 — fuel-cost/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var dist = get('distance') * (seg('round') === 'round' ? 2 : 1);
    var eff = get('efficiency'), fp = get('fuelPrice');
    var people = Math.max(1, Math.round(get('people') || 1));
    var toll = get('toll') || 0, park = get('parking') || 0;

    var liters = dist / eff;
    var fuelCost = liters * fp;
    var total = fuelCost + toll + park;
    var perKm = total / dist;

    var evEff = get('evEff'), evP = get('evPrice');
    var kwh = isFinite(evEff) && evEff > 0 ? dist / evEff : null;
    var evCost = kwh !== null && isFinite(evP) ? kwh * evP : null;

    var monthly = get('monthlyKm');
    var rows = [
      { k: '총 주행거리', v: fmt(dist) + ' km', note: seg('round') === 'round' ? '왕복 기준' : '편도 기준' },
      { k: '필요 연료', v: fmt(liters, 2) + ' L', note: fmt(eff) + 'km/L' },
      { k: '유류비', v: won(fuelCost), note: 'L당 ' + won(fp) },
      { k: '통행료', v: won(toll) },
      { k: '주차비', v: won(park) },
      { k: '총 주행비용', v: won(total), total: true },
      { k: 'km당 비용', v: won(perKm) + ' / km', note: '연료+통행+주차' }
    ];
    if (evCost !== null) {
      rows.push({ k: '전기차 충전량', v: fmt(kwh, 2) + ' kWh', note: fmt(evEff) + 'km/kWh' });
      rows.push({ k: '전기차 충전비', v: won(evCost), note: 'kWh당 ' + won(evP) });
      rows.push({ k: '전기차 절감액', v: won(Math.max(0, fuelCost - evCost)), cls: 'is-good', note: '연료비 대비' });
    }
    if (people > 1) rows.push({ k: '1인당 부담', v: won(total / people), note: people + '명 분담' });
    if (isFinite(monthly) && monthly > 0) {
      var mCost = monthly / eff * fp;
      rows.push({ k: '월 주행 비용', v: won(mCost), note: fmt(monthly) + 'km · 연료만' });
      rows.push({ k: '연간 주행 비용', v: won(mCost * 12), note: '연료만' });
    }

    var table = [];
    [100, 300, 500, 1000].forEach(function (d) {
      table.push([fmt(d) + 'km', fmt(d / eff, 2) + 'L', won(d / eff * fp),
                  evCost !== null ? won(d / (evEff || 1) * evP) : '—']);
    });

    return {
      verdict: {
        kicker: '총 주행비용', icon: '⛽',
        title: won(total),
        desc: fmt(dist) + 'km 주행에 연료 <b>' + fmt(liters, 2) + 'L</b>, 유류비 <b>' + won(fuelCost) + '</b>입니다. '
              + 'km당 <b>' + won(perKm) + '</b>. '
              + (evCost !== null ? '같은 거리를 전기차로 가면 충전비 <b>' + won(evCost) + '</b>으로 <b>' + won(Math.max(0, fuelCost - evCost)) + '</b> 아낍니다.' : '')
              + (people > 1 ? ' ' + people + '명이 나누면 1인당 <b>' + won(total / people) + '</b>입니다.' : ''),
        cls: 'verdict--accent'
      },
      stats: [
        { l: '유류비', v: wonShort(fuelCost), cls: 'is-accent' },
        { l: '총비용', v: wonShort(total) },
        { l: 'km당', v: won(perKm) },
        { l: '1인당', v: people > 1 ? wonShort(total / people) : '-', s: people > 1 ? people + '명' : '혼자' }
      ],
      rows: rows,
      bars: [
        { l: '유류비', v: fuelCost, max: Math.max(total, fuelCost, evCost || 0), text: wonShort(fuelCost), color: 'bar__fill--kcal' },
        { l: '통행·주차', v: toll + park, max: Math.max(total, fuelCost, evCost || 0), text: wonShort(toll + park), color: 'bar__fill--carb' },
        { l: '전기차 충전비', v: evCost || 0, max: Math.max(total, fuelCost, evCost || 0), text: evCost === null ? '—' : wonShort(evCost), color: 'bar__fill--green', hidden: evCost === null }
      ],
      table: { head: ['거리', '필요 연료', '유류비', '전기차 충전비'], rows: table,
               note: '연비 ' + fmt(eff) + 'km/L · 유가 ' + fmt(fp) + '원/L 기준입니다.' },
      notes: [
        { html: '<b>실연비가 핵심</b>입니다. 공인연비 15km/L인 차가 도심·에어컨 사용으로 11km/L가 되면 연료비가 36% 늘어납니다. 최근 3회 주유 기록으로 실연비를 계산해 넣으세요.' },
        { html: '전기차는 <b>충전 방식</b>에 따라 비용이 2배 차이 납니다. 완속(가정용·아파트) kWh당 200~250원, 급속 350~450원입니다. 회원제 할인·무료 충전소를 활용하면 더 줄어듭니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["distance", "efficiency", "fuelPrice", "people", "toll", "parking", "evEff", "evPrice", "monthlyKm"],
    segs: ["round"],
    checks: [],
    required: ["distance", "efficiency", "fuelPrice"],
    presets: {"300km 편도 · 연비 12": {"fields": {"distance": 300, "efficiency": 12, "fuelPrice": 1650, "people": 1, "toll": 0, "parking": 0, "evEff": 5, "evPrice": 350, "monthlyKm": 0}, "segs": {"round": "one"}}, "왕복 500km · SUV 연비 8": {"fields": {"distance": 500, "efficiency": 8, "fuelPrice": 1650, "people": 4, "toll": 12000, "parking": 5000, "evEff": 4.5, "evPrice": 380, "monthlyKm": 0}, "segs": {"round": "round"}}, "월 1,500km 통근": {"fields": {"distance": 50, "efficiency": 14, "fuelPrice": 1650, "people": 1, "toll": 0, "parking": 0, "evEff": 5.5, "evPrice": 300, "monthlyKm": 1500}, "segs": {"round": "round"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
