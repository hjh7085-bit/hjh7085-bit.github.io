/* 하루 단백질·칼로리 계산기 (BMR·TDEE·목표별) — protein-calorie/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var ACT = { '1.2': 1.2, '1.375': 1.375, '1.55': 1.55, '1.725': 1.725, '1.9': 1.9 };

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var sex = seg('sex'), h = get('height'), w = get('weight'), a = get('age');
    var bf = get('bodyfat');
    var act = ACT[seg('activity')] || 1.375;
    var goal = seg('goal'), protMode = seg('prot');

    var bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'm' ? 5 : -161);
    var tdee = bmr * act;
    var target = goal === 'cut' ? tdee * 0.8 : goal === 'bulk' ? tdee * 1.1 : tdee;

    var lbm = isFinite(bf) && bf > 0 ? w * (1 - bf / 100) : null;
    var base = lbm && lbm > 0 ? lbm : w;
    var perKg = protMode === 'high' ? 2.1 : protMode === 'kidney' ? 1.0 : (goal === 'cut' ? 1.8 : goal === 'bulk' ? 1.7 : 1.4);
    if (protMode === 'std' && goal === 'keep') perKg = 1.3;
    var protein = base * perKg;

    var fatKcal = target * 0.28;
    var fat = fatKcal / 9;
    var carbKcal = Math.max(0, target - protein * 4 - fatKcal);
    var carb = carbKcal / 4;

    var perMeal3 = protein / 3, perMeal4 = protein / 4;
    var deficit = tdee - target;
    var weekly = deficit * 7 / 7700;

    var rows = [
      { k: '기초대사량 (BMR)', v: fmt(Math.round(bmr)) + ' kcal', note: '아무것도 안 해도 쓰는 양' },
      { k: '활동 대사량 (TDEE)', v: fmt(Math.round(tdee)) + ' kcal', note: '활동계수 ' + act },
      { k: '목표 칼로리', v: fmt(Math.round(target)) + ' kcal', total: true, note: goal === 'cut' ? 'TDEE −20%' : goal === 'bulk' ? 'TDEE +10%' : '유지' },
      { k: '단백질', v: fmt(Math.round(protein)) + ' g', note: fmt(perKg, 1) + 'g/kg · ' + fmt(Math.round(protein * 4)) + ' kcal' },
      { k: '지방', v: fmt(Math.round(fat)) + ' g', note: '목표 칼로리의 28%' },
      { k: '탄수화물', v: fmt(Math.round(carb)) + ' g', note: '나머지 칼로리' },
      { k: '끼니별 단백질 (3끼)', v: fmt(Math.round(perMeal3)) + ' g', note: '4끼면 ' + fmt(Math.round(perMeal4)) + 'g' },
      { k: '물', v: fmt((w * 0.033).toFixed(1)) + ' L', note: '체중 1kg당 33ml' }
    ];

    var pace = goal === 'cut'
      ? '이 적자(−' + fmt(Math.round(deficit)) + ' kcal/일)를 유지하면 주 약 <b>' + fmt(Math.abs(weekly), 2) + 'kg</b>씩 줄어듭니다.'
      : goal === 'bulk' ? '이 흑자(+' + fmt(Math.round(-deficit)) + ' kcal/일)로 월 약 1kg 안팎의 증량이 기대됩니다.'
      : 'TDEE와 같은 양을 먹으면 체중이 유지됩니다.';

    return {
      verdict: {
        kicker: '목표 칼로리 · 단백질', icon: '🥩',
        title: fmt(Math.round(target)) + ' kcal · ' + fmt(Math.round(protein)) + 'g',
        desc: 'BMR <b>' + fmt(Math.round(bmr)) + ' kcal</b>, TDEE <b>' + fmt(Math.round(tdee)) + ' kcal</b>입니다. ' + pace
              + (lbm ? ' 제지방량 ' + fmt(lbm, 1) + 'kg 기준 단백질을 계산했습니다.' : ' 체지방률을 넣으면 제지방량 기준으로 더 정확해집니다.'),
        cls: 'verdict--ok'
      },
      stats: [
        { l: 'BMR', v: fmt(Math.round(bmr)) + ' kcal' },
        { l: 'TDEE', v: fmt(Math.round(tdee)) + ' kcal' },
        { l: '목표 칼로리', v: fmt(Math.round(target)) + ' kcal', cls: 'is-accent' },
        { l: '단백질', v: fmt(Math.round(protein)) + ' g', cls: 'is-good' }
      ],
      rows: rows,
      bars: [
        { l: '단백질', v: protein * 4, max: target, text: fmt(Math.round(protein)) + 'g · ' + fmt(Math.round(protein * 4 / target * 100)) + '%', color: 'bar__fill--prot' },
        { l: '지방', v: fatKcal, max: target, text: fmt(Math.round(fat)) + 'g · ' + fmt(Math.round(fatKcal / target * 100)) + '%', color: 'bar__fill--fat' },
        { l: '탄수화물', v: carbKcal, max: target, text: fmt(Math.round(carb)) + 'g · ' + fmt(Math.round(carbKcal / target * 100)) + '%', color: 'bar__fill--carb' }
      ],
      table: { head: ['목표', '칼로리', '단백질', '감량 속도'], rows: [
          ['감량 (−20%)', fmt(Math.round(tdee * 0.8)) + ' kcal', fmt(Math.round(base * 1.8)) + 'g', '주 ' + fmt(tdee * 0.2 * 7 / 7700, 2) + 'kg'],
          ['유지', fmt(Math.round(tdee)) + ' kcal', fmt(Math.round(base * 1.3)) + 'g', '—'],
          ['증량 (+10%)', fmt(Math.round(tdee * 1.1)) + ' kcal', fmt(Math.round(base * 1.7)) + 'g', '월 1kg 내외']
        ], note: '단백질은 표준 강도 기준입니다.' },
      notes: [
        { html: '<b>단백질을 나눠 먹는 게 핵심</b>입니다. 한 끼에 40g 이상 몰아 먹으면 근육 합성 반응이 포화됩니다. 3~4끼에 ' + fmt(Math.round(perMeal3)) + '~' + fmt(Math.round(perMeal4)) + 'g씩 나누는 편이 효율적입니다.' },
        { html: '감량 초기 2주는 수분 손실로 체중이 빨리 줄지만, 이후엔 <b>주 0.5~0.8kg</b>이 현실적입니다. 그보다 빠르면 근손실·요요 위험이 커집니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["height", "weight", "age", "bodyfat"],
    segs: ["sex", "activity", "goal", "prot"],
    checks: [],
    required: ["height", "weight", "age"],
    presets: {"남 178cm 82kg 감량": {"fields": {"height": 178, "weight": 82, "age": 34, "bodyfat": ""}, "segs": {"sex": "m", "activity": "1.375", "goal": "cut", "prot": "std"}}, "여 162cm 58kg 유지": {"fields": {"height": 162, "weight": 58, "age": 29, "bodyfat": ""}, "segs": {"sex": "f", "activity": "1.55", "goal": "keep", "prot": "std"}}, "남 175cm 95kg 고단백 감량": {"fields": {"height": 175, "weight": 95, "age": 41, "bodyfat": 32}, "segs": {"sex": "m", "activity": "1.2", "goal": "cut", "prot": "high"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
