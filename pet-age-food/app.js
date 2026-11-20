/* 반려견·반려묘 나이 & 하루 사료량 계산기 — pet-age-food/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function humanAge(species, age) {
    if (age <= 0) return 0;
    var y = 0;
    if (species === 'dog') {
      if (age <= 1) return Math.round(age * 15);
      if (age <= 2) return Math.round(15 + (age - 1) * 9);
      y = 24 + (age - 2) * 5;
    } else {
      if (age <= 1) return Math.round(age * 15);
      if (age <= 2) return Math.round(15 + (age - 1) * 9);
      y = 24 + (age - 2) * 4;
    }
    return Math.round(y);
  }
  var FACTOR = { neutered: 1.6, intact: 1.8, active: 2.0, diet: 1.2, senior: 1.4 };

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var kg = get('weight') || 0, age = get('age') || 0;
    var species = seg('species'), state = seg('state');
    var kcal100 = isFinite(get('kcal')) ? get('kcal') : 380;

    var human = humanAge(species, age);
    var rer = 70 * Math.pow(Math.max(0.3, kg), 0.75);
    var factor = FACTOR[state] || 1.6;
    var der = rer * factor;
    var gram = kcal100 > 0 ? der / kcal100 * 100 : 0;
    var gramLow = gram * 0.9, gramHigh = gram * 1.1;
    var perMeal = gram / 2;
    var lifeStage = species === 'dog'
      ? (age < 1 ? '퍼피' : age < 7 ? '성견' : age < 10 ? '시니어' : '노령견')
      : (age < 1 ? '키튼' : age < 7 ? '성묘' : age < 11 ? '시니어' : '노령묘');

    var rows = [
      { k: '사람 나이 환산', v: human + '세', note: lifeStage },
      { k: '체중', v: fmt(kg, 1) + 'kg' },
      { k: 'RER (안정시 에너지)', v: fmt(rer, 0) + 'kcal/일', note: '70 × 체중^0.75' },
      { k: '활동 계수', v: fmt(factor, 1) },
      { k: 'DER (하루 필요 열량)', v: fmt(der, 0) + 'kcal/일', total: true },
      { k: '사료 급여량', v: fmt(gram, 0) + 'g/일', note: fmt(kcal100) + 'kcal/100g 기준' },
      { k: '1회 급여 (하루 2회)', v: fmt(perMeal, 0) + 'g' },
      { k: '하루 3회로 나누면', v: fmt(gram / 3, 0) + 'g' },
      { k: '한 달 소요량', v: fmt(gram * 30 / 1000, 2) + 'kg' }
    ];

    var table = [1, 2, 3, 5, 7, 9].map(function (a) {
      return [a + '살', humanAge(species, a) + '세',
              fmt(70 * Math.pow(kg, 0.75) * FACTOR[a === 9 ? 'senior' : state], 0) + 'kcal',
              fmt(70 * Math.pow(kg, 0.75) * FACTOR[a === 9 ? 'senior' : state] / kcal100 * 100, 0) + 'g'];
    });

    return {
      verdict: {
        kicker: '하루 급여량', icon: '🐾',
        title: fmt(gram, 0) + 'g / 일',
        desc: fmt(kg, 1) + 'kg ' + (species === 'dog' ? '강아지' : '고양이') + ' ' + fmt(age, 1) + '살은 사람 나이 <b>' + human + '세</b>(' + lifeStage + ')입니다. ' +
              '하루 필요 열량은 <b>' + fmt(der, 0) + 'kcal</b>이고, ' + fmt(kcal100) + 'kcal/100g 사료로는 <b>' + fmt(gram, 0) + 'g</b>입니다. ' +
              '하루 2회로 나누면 ' + fmt(perMeal, 0) + 'g씩 주세요.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '사람 나이', v: human + '세', cls: 'is-accent' },
        { l: '필요 열량', v: fmt(der, 0) + 'kcal' },
        { l: '사료량', v: fmt(gram, 0) + 'g/일' },
        { l: '한 달', v: fmt(gram * 30 / 1000, 2) + 'kg' }
      ],
      rows: rows,
      bars: [
        { l: 'RER', v: rer, max: der * 1.1, text: fmt(rer, 0) + 'kcal', color: 'bar__fill--prot' },
        { l: 'DER', v: der, max: der * 1.1, text: fmt(der, 0) + 'kcal', color: 'bar__fill--green' }
      ],
      table: { head: ['나이', '사람 나이', '필요 열량', '사료량'], rows: table,
               note: '같은 체중·사료에서 나이만 바꾼 값입니다(7세 이상은 노령 계수 적용).' },
      notes: [{ html: '<b>사료량은 ±10% 범위에서 조정</b> — ' + fmt(gramLow, 0) + '~' + fmt(gramHigh, 0) + 'g을 기준으로 시작해, 2~4주 뒤 체중과 변 상태를 보고 늘리거나 줄이세요. 간식은 하루 열량의 10% 이내로 제한하는 것이 좋습니다.' }]
    };
  }

  WT.mount({
    fields: ["weight", "age", "kcal"],
    segs: ["species", "state"],
    checks: [],
    required: ["weight", "age"],
    presets: {"강아지 5.2kg · 3살": {"fields": {"weight": 5.2, "age": 3, "kcal": 380}, "segs": {"species": "dog", "state": "neutered"}}, "고양이 4.3kg · 2살": {"fields": {"weight": 4.3, "age": 2, "kcal": 400}, "segs": {"species": "cat", "state": "neutered"}}, "강아지 12kg · 8살 다이어트": {"fields": {"weight": 12, "age": 8, "kcal": 340}, "segs": {"species": "dog", "state": "diet"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
