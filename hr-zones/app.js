/* 심박수 존 계산기 (Zone 1~5 · 지방연소·유산소·한계) — hr-zones/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var ZONES = [
    { n: 1, name: '회복', lo: 0.50, hi: 0.60, color: 'bar__fill--prot', desc: '가벼운 걷기·스트레칭. 회복과 컨디셔닝.' },
    { n: 2, name: '지방연소', lo: 0.60, hi: 0.70, color: 'bar__fill--green', desc: '빠르게 걷기·조깅. 지방을 가장 효율적으로 태우는 구간.' },
    { n: 3, name: '유산소', lo: 0.70, hi: 0.80, color: 'bar__fill--amber', desc: '러닝. 심폐지구력과 심장 근육을 강화.' },
    { n: 4, name: '한계', lo: 0.80, hi: 0.90, color: 'bar__fill--kcal', desc: '인터벌·스프린트. 속도와 무산소 능력 향상.' },
    { n: 5, name: '최대', lo: 0.90, hi: 1.00, color: 'bar__fill--kcal', desc: '전력 질주. 짧게만, 회복 충분히.' }
  ];

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var age = get('age') || 30;
    var rest = isFinite(get('rest')) ? get('rest') : 70;
    var maxHr = seg('formula') === 'tanaka' ? 208 - 0.7 * age : 220 - age;
    var reserve = maxHr - rest;
    var simpleMax = 220 - age;

    var rows = [
      { k: '나이', v: fmt(age) + '세' },
      { k: '최대심박수 (추정)', v: fmt(maxHr, 0) + 'bpm', note: seg('formula') === 'tanaka' ? '타나카 공식' : '220 − 나이' },
      { k: '안정시 심박수', v: fmt(rest) + 'bpm' },
      { k: '심박 예비량 (HRR)', v: fmt(reserve, 0) + 'bpm', note: '최대 − 안정' }
    ];

    var table = ZONES.map(function (z) {
      var lo = rest + reserve * z.lo;
      var hi = rest + reserve * z.hi;
      return ['Zone ' + z.n + ' ' + z.name, fmt(lo, 0) + '~' + fmt(hi, 0), fmt(z.lo * 100) + '~' + fmt(z.hi * 100) + '%', z.desc];
    });

    var goalZone = seg('goal') === 'fat' ? 2 : seg('goal') === 'endur' ? 3 : 2;
    var gz = ZONES[goalZone - 1];
    var gLo = rest + reserve * gz.lo, gHi = rest + reserve * gz.hi;

    var z2 = ZONES[1];
    return {
      verdict: {
        kicker: '목표 구간 (Zone ' + gz.n + ' ' + gz.name + ')', icon: '❤️',
        title: fmt(gLo, 0) + '~' + fmt(gHi, 0) + ' bpm',
        desc: '최대심박수는 <b>' + fmt(maxHr, 0) + 'bpm</b>(220−나이 기준 ' + fmt(simpleMax, 0) + 'bpm)입니다. ' +
              '목표가 ' + (seg('goal') === 'fat' ? '지방연소' : seg('goal') === 'endur' ? '지구력 향상' : '균형') + '일 때는 <b>Zone ' + gz.n + ' ' + gz.name + '</b>(' + fmt(gLo, 0) + '~' + fmt(gHi, 0) + 'bpm)에서 ' +
              (gz.n === 2 ? '30~50분 운동하세요. 대화가 가능한 정도의 강도가 이 구간입니다.' : '30~50분 운동하세요. 참고로 Zone 2 지방연소 구간은 ' + fmt(rest + reserve * z2.lo, 0) + '~' + fmt(rest + reserve * z2.hi, 0) + 'bpm입니다.'),
        cls: 'verdict--ok'
      },
      stats: [
        { l: '최대심박', v: fmt(maxHr, 0) + 'bpm' },
        { l: 'Zone 2', v: fmt(rest + reserve * z2.lo, 0) + '~' + fmt(rest + reserve * z2.hi, 0) },
        { l: 'Zone 4', v: fmt(rest + reserve * 0.8, 0) + '~' + fmt(rest + reserve * 0.9, 0) },
        { l: '예비량', v: fmt(reserve, 0) + 'bpm' }
      ],
      rows: rows,
      bars: ZONES.map(function (z) {
        var lo = rest + reserve * z.lo;
        return { l: 'Z' + z.n + ' ' + z.name, v: lo, max: maxHr, text: fmt(lo, 0) + '~' + fmt(rest + reserve * z.hi, 0), color: z.color };
      }),
      table: { head: ['존', '심박 범위 (bpm)', '최대심박 대비', '효과'], rows: table,
               note: '카르보넨 공식(안정시 심박 반영)으로 계산한 범위입니다.' },
      notes: [{ html: '<b>Zone 2가 중요한 이유</b> — 지방을 에너지로 쓰는 비율이 가장 높고, 다음 날 피로가 적어 매일 할 수 있습니다. 주 150분 이상 Zone 2를 채우면 심폐지구력과 인슐린 감수성이 함께 좋아집니다.' }]
    };
  }

  WT.mount({
    fields: ["age", "rest"],
    segs: ["formula", "goal"],
    checks: [],
    required: ["age"],
    presets: {"33세 · 안정 65 · 지방연소": {"fields": {"age": 33, "rest": 65}, "segs": {"formula": "simple", "goal": "fat"}}, "45세 · 안정 72 · 지구력": {"fields": {"age": 45, "rest": 72}, "segs": {"formula": "tanaka", "goal": "endur"}}, "28세 · 안정 58 · 균형": {"fields": {"age": 28, "rest": 58}, "segs": {"formula": "simple", "goal": "mix"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
