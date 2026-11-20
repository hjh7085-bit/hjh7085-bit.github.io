/* 수하물 무게·부피 체크기 (cm↔inch·kg↔lb · 항공사 규정) — baggage-size/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var RULE = {
    fsc: { carrySum: 115, carryKg: 12, checkSum: 158, checkKg: 23, fee: 60000 },
    lcc: { carrySum: 115, carryKg: 10, checkSum: 203, checkKg: 15, fee: 40000 },
    cargo: { carrySum: 115, carryKg: 12, checkSum: 158, checkKg: 23, fee: 100000 }
  };

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var w = get('w') || 0, d = get('d') || 0, h = get('h') || 0, kg = get('kg') || 0;
    var kind = seg('kind');
    var rule = RULE[seg('airline')] || RULE.fsc;
    var isCarry = kind === 'carry';
    var limitSum = isCarry ? rule.carrySum : rule.checkSum;
    var limitKg = isCarry ? rule.carryKg : rule.checkKg;
    var sum = w + d + h;
    var volume = w * d * h / 1000000;

    var sumOk = sum <= limitSum;
    var kgOk = kg <= limitKg;
    var ok = sumOk && kgOk;
    var overKg = Math.max(0, kg - limitKg);
    var fee = 0;
    if (!kgOk) fee = Math.ceil(overKg / 5) * rule.fee;
    if (kg > 32) fee = Math.max(fee, rule.fee * 3);

    var rows = [
      { k: '가로 × 세로 × 높이', v: fmt(w) + ' × ' + fmt(d) + ' × ' + fmt(h) + ' cm' },
      { k: '삼면 합계', v: fmt(sum) + ' cm', note: '한도 ' + fmt(limitSum) + 'cm' },
      { k: '부피', v: fmt(volume, 1) + ' L', note: fmt(w / 2.54, 1) + ' × ' + fmt(d / 2.54, 1) + ' × ' + fmt(h / 2.54, 1) + ' inch' },
      { k: '무게', v: fmt(kg, 1) + ' kg', note: fmt(kg * 2.2046, 1) + ' lb · 한도 ' + fmt(limitKg) + 'kg' },
      { k: '치수 판정', v: sumOk ? '통과' : '초과 ' + fmt(sum - limitSum) + 'cm' },
      { k: '무게 판정', v: kgOk ? '통과' : '초과 ' + fmt(overKg, 1) + 'kg' },
      { k: '초과 요금 (예상)', v: fee > 0 ? won(fee) : '없음', total: true }
    ];

    var table = [[55, 40, 20, 10], [57, 40, 22, 12], [70, 45, 30, 23], [78, 52, 30, 28], [85, 55, 35, 32]].map(function (c) {
      var s2 = c[0] + c[1] + c[2];
      return [c[0] + '×' + c[1] + '×' + c[2], fmt(s2) + 'cm', c[3] + 'kg',
              s2 <= 115 && c[3] <= 10 ? '기내 가능' : s2 <= 158 && c[3] <= 23 ? '위탁 가능' : '초과'];
    });

    return {
      verdict: {
        kicker: (isCarry ? '기내 반입' : '위탁 수하물') + ' 판정', icon: ok ? '🧳' : '⚠️',
        title: (ok ? '가능' : '초과') + ' · ' + fmt(sum) + 'cm / ' + fmt(kg, 1) + 'kg',
        desc: '삼면 합계 <b>' + fmt(sum) + 'cm</b>(한도 ' + fmt(limitSum) + 'cm) · 무게 <b>' + fmt(kg, 1) + 'kg</b>(한도 ' + fmt(limitKg) + 'kg)입니다. ' +
              (ok ? '치수와 무게 모두 통과해 그대로 가져갈 수 있습니다.' : '치수 ' + (sumOk ? '통과' : '초과') + ', 무게 ' + (kgOk ? '통과' : '초과') + '입니다. ' +
               (fee > 0 ? '예상 초과 요금은 <b>' + won(fee) + '</b>으로, 사전 구매보다 2~3배 비쌀 수 있습니다.' : '무게를 줄이거나 가방을 바꾸세요.')) +
              ' 부피는 ' + fmt(volume, 1) + 'L입니다.',
        cls: ok ? 'verdict--ok' : 'verdict--warn'
      },
      stats: [
        { l: '삼면 합계', v: fmt(sum) + 'cm', cls: sumOk ? 'is-good' : 'is-bad', s: '한도 ' + fmt(limitSum) },
        { l: '무게', v: fmt(kg, 1) + 'kg', cls: kgOk ? 'is-good' : 'is-bad', s: '한도 ' + fmt(limitKg) },
        { l: '부피', v: fmt(volume, 1) + 'L' },
        { l: '초과 요금', v: fee > 0 ? won(fee) : '없음', cls: fee > 0 ? 'is-bad' : 'is-good' }
      ],
      rows: rows,
      bars: [
        { l: '삼면 합계', v: Math.min(sum, limitSum * 1.3), max: limitSum * 1.3, text: fmt(sum) + ' / ' + fmt(limitSum) + 'cm', color: sumOk ? 'bar__fill--green' : 'bar__fill--kcal' },
        { l: '무게', v: Math.min(kg, limitKg * 1.5), max: limitKg * 1.5, text: fmt(kg, 1) + ' / ' + fmt(limitKg) + 'kg', color: kgOk ? 'bar__fill--green' : 'bar__fill--kcal' }
      ],
      table: { head: ['치수(cm)', '삼면 합', '무게', '판정'], rows: table,
               note: '일반적인 캐리어 크기별 판정입니다(대형항공사 기준).' },
      notes: [{ html: '<b>현장 결제는 비쌉니다</b> — 초과 수하물은 공항 카운터에서 결제하면 사전 구매의 2~3배입니다. LCC는 출발 24시간 전까지 앱에서 미리 사면 40~60% 저렴합니다. 32kg을 넘으면 위탁이 거부될 수 있어 분리 포장이 필요합니다.' }]
    };
  }

  WT.mount({
    fields: ["w", "d", "h", "kg"],
    segs: ["kind", "airline"],
    checks: [],
    required: ["w", "d", "h", "kg"],
    presets: {"기내 55×40×20 · 12kg": {"fields": {"w": 55, "d": 40, "h": 20, "kg": 12}, "segs": {"kind": "carry", "airline": "fsc"}}, "위탁 65×45×25 · 22kg": {"fields": {"w": 65, "d": 45, "h": 25, "kg": 22}, "segs": {"kind": "check", "airline": "fsc"}}, "위탁 80×50×35 · 32kg": {"fields": {"w": 80, "d": 50, "h": 35, "kg": 32}, "segs": {"kind": "check", "airline": "lcc"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
