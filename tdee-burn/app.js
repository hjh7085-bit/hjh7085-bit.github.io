/* 기초대사량·운동별 칼로리 소모 계산기 (MET 기준) — tdee-burn/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var MET = { walk: 3.5, fast: 5.0, run: 8.3, bike: 8.0, swim: 8.0, weight: 5.0, yoga: 2.5, hike: 6.0, rope: 12.3 };
  var METNAME = { walk: '걷기', fast: '빠르게 걷기', run: '달리기', bike: '자전거', swim: '수영', weight: '근력 운동', yoga: '요가', hike: '등산', rope: '줄넘기' };
  var ACT = { sed: 1.2, light: 1.375, mod: 1.55, high: 1.725, very: 1.9 };

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var h = get('height') || 0, w = get('weight') || 0, age = get('age') || 30;
    var male = seg('sex') === 'm';
    var act = ACT[seg('act')] || 1.375;
    var sport = seg('sport');
    var minutes = isFinite(get('minutes')) ? get('minutes') : 30;

    var bmr = 10 * w + 6.25 * h - 5 * age + (male ? 5 : -161);
    var tdee = bmr * act;
    var met = MET[sport] || 3.5;
    var burn = met * 3.5 * w / 200 * minutes;
    var perMin = minutes > 0 ? burn / minutes : 0;

    var rows = [
      { k: '키 / 체중 / 나이', v: fmt(h) + 'cm · ' + fmt(w, 1) + 'kg · ' + fmt(age) + '세' },
      { k: 'BMR (기초대사량)', v: fmt(bmr, 0) + 'kcal', note: '가만히 있어도 쓰는 열량' },
      { k: '활동 계수', v: fmt(act, 3) },
      { k: 'TDEE (하루 총소모)', v: fmt(tdee, 0) + 'kcal', total: true },
      { k: '운동', v: METNAME[sport] + ' (' + fmt(met, 1) + ' MET) × ' + fmt(minutes) + '분' },
      { k: '운동 소모 칼로리', v: fmt(burn, 0) + 'kcal', note: '분당 ' + fmt(perMin, 1) + 'kcal' },
      { k: '감량 목표 (-500kcal/일)', v: fmt(tdee - 500, 0) + 'kcal' },
      { k: '유지 목표', v: fmt(tdee, 0) + 'kcal' },
      { k: '증량 목표 (+300kcal/일)', v: fmt(tdee + 300, 0) + 'kcal' },
      { k: '지방 1kg 감량 소요', v: '약 7,700kcal', note: '운동 ' + fmt(minutes) + '분씩 ' + fmt(Math.ceil(7700 / Math.max(1, burn)), 0) + '회' }
    ];

    var table = Object.keys(MET).map(function (k) {
      var b = MET[k] * 3.5 * w / 200 * 30;
      return [METNAME[k], fmt(MET[k], 1), fmt(b, 0) + 'kcal', fmt(b * 2, 0) + 'kcal'];
    });

    return {
      verdict: {
        kicker: '하루 총 소모 열량 (TDEE)', icon: '🔥',
        title: fmt(tdee, 0) + ' kcal',
        desc: '기초대사량 <b>' + fmt(bmr, 0) + 'kcal</b>에 활동 계수 ' + fmt(act, 2) + '를 곱해 <b>' + fmt(tdee, 0) + 'kcal</b>입니다. ' +
              METNAME[sport] + ' ' + fmt(minutes) + '분은 <b>' + fmt(burn, 0) + 'kcal</b>를 태웁니다. ' +
              '하루 500kcal씩 줄이면 이론적으로 월 1.9kg 감량이 가능합니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: 'BMR', v: fmt(bmr, 0) + 'kcal' },
        { l: 'TDEE', v: fmt(tdee, 0) + 'kcal', cls: 'is-accent' },
        { l: '운동 소모', v: fmt(burn, 0) + 'kcal' },
        { l: '감량 목표', v: fmt(tdee - 500, 0) + 'kcal' }
      ],
      rows: rows,
      bars: [
        { l: 'BMR', v: bmr, max: tdee * 1.1, text: fmt(bmr, 0) + 'kcal', color: 'bar__fill--prot' },
        { l: '활동 소모', v: tdee - bmr, max: tdee * 1.1, text: fmt(tdee - bmr, 0) + 'kcal', color: 'bar__fill--accent' },
        { l: '운동 추가', v: burn, max: tdee * 1.1, text: fmt(burn, 0) + 'kcal', color: 'bar__fill--green' }
      ],
      table: { head: ['운동', 'MET', '30분', '60분'], rows: table,
               note: '내 체중 기준 30분·60분 운동 시 소모 칼로리입니다.' },
      notes: [{ html: '<b>운동보다 식사가 빠릅니다</b> — 달리기 30분으로 360kcal를 태우지만, 그 양은 김밥 한 줄 수준입니다. 500kcal 적자를 만들려면 식사 조절(300kcal)과 운동(200kcal)을 병행하는 것이 현실적입니다.' }]
    };
  }

  WT.mount({
    fields: ["height", "weight", "age", "minutes"],
    segs: ["sex", "act", "sport"],
    checks: [],
    required: ["height", "weight", "age"],
    presets: {"175cm 78kg · 걷기 40분": {"fields": {"height": 175, "weight": 78, "age": 33, "minutes": 40}, "segs": {"sex": "m", "act": "light", "sport": "walk"}}, "175cm 78kg · 달리기 30분": {"fields": {"height": 175, "weight": 78, "age": 33, "minutes": 30}, "segs": {"sex": "m", "act": "mod", "sport": "run"}}, "160cm 52kg · 요가 60분": {"fields": {"height": 160, "weight": 52, "age": 28, "minutes": 60}, "segs": {"sex": "f", "act": "light", "sport": "yoga"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
